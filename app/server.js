const express = require('express');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const path = require('path');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Cesta k options souboru
const OPTIONS_FILE = '/data/options.json';
const NGINX_DEVICES_DIR = '/etc/nginx/devices';
const NGINX_CONF_DIR = '/etc/nginx/conf.d';

// Pomocná funkce pro načtení options
async function loadOptions() {
    try {
        if (await fs.pathExists(OPTIONS_FILE)) {
            const data = await fs.readFile(OPTIONS_FILE, 'utf8');
            return JSON.parse(data);
        }
        return { devices: [], ssl: false, log_level: 'info' };
    } catch (error) {
        console.error('Chyba při načítání options:', error);
        return { devices: [], ssl: false, log_level: 'info' };
    }
}

// Pomocná funkce pro uložení options
async function saveOptions(options) {
    try {
        await fs.writeFile(OPTIONS_FILE, JSON.stringify(options, null, 2));
        await generateNginxConfig(options);
        return true;
    } catch (error) {
        console.error('Chyba při ukládání options:', error);
        return false;
    }
}

// Generování nginx konfigurace pro zařízení
async function generateNginxConfig(options) {
    try {
        // Vytvoření adresářů
        await fs.ensureDir(NGINX_DEVICES_DIR);
        await fs.ensureDir(NGINX_CONF_DIR);

        // Vyčištění starých konfigurací
        await fs.emptyDir(NGINX_DEVICES_DIR);

        // Generování konfigurace pro každé zařízení
        for (const device of options.devices) {
            const deviceConfig = generateDeviceConfig(device);
            const configPath = path.join(NGINX_DEVICES_DIR, `${device.name.replace(/[^a-zA-Z0-9]/g, '_')}.conf`);
            await fs.writeFile(configPath, deviceConfig);
        }

        // Generování upstream konfigurace
        const upstreamConfig = generateUpstreamConfig(options.devices);
        await fs.writeFile(path.join(NGINX_CONF_DIR, 'upstream.conf'), upstreamConfig);

        console.log('Nginx konfigurace byla úspěšně vygenerována');
    } catch (error) {
        console.error('Chyba při generování nginx konfigurace:', error);
    }
}

// Generování konfigurace pro jednotlivé zařízení
function generateDeviceConfig(device) {
    const pathPrefix = device.path_prefix || `/${device.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const upstreamName = device.name.replace(/[^a-zA-Z0-9]/g, '_');
    
    let config = `
# Konfigurace pro ${device.name}
location ${pathPrefix}/ {
    proxy_pass http://${upstreamName}_upstream/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;
    
    # Timeout nastavení
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
    
    # Buffer nastavení
    proxy_buffering on;
    proxy_buffer_size 4k;
    proxy_buffers 8 4k;
    
    # Přidání custom headers
`;

    if (device.custom_headers) {
        for (const header of device.custom_headers) {
            config += `    proxy_set_header ${header};\n`;
        }
    }

    if (device.rewrite_paths) {
        config += `
    # Přepisování cest pomocí Lua
    header_filter_by_lua_block {
        local path_rewriter = require("path_rewriter")
        local headers = ngx.header
        ngx.header = path_rewriter.rewrite_response_headers(headers, "/", "${pathPrefix}/")
    }
    
    body_filter_by_lua_block {
        local path_rewriter = require("path_rewriter")
        local content_type = ngx.header.content_type or ""
        
        if ngx.arg[2] then
            local body = ngx.arg[1]
            if body then
                local rewritten_body = path_rewriter.rewrite_content(body, content_type, "/", "${pathPrefix}/")
                ngx.arg[1] = rewritten_body
            end
        end
    }
`;
    }

    if (device.auth_required && device.basic_auth_user && device.basic_auth_pass) {
        config += `
    # Basic auth
    auth_basic "Restricted Access";
    auth_basic_user_file /etc/nginx/auth/${upstreamName}.htpasswd;
`;
    }

    config += `}

# Bez koncového lomítka
location ${pathPrefix} {
    return 301 ${pathPrefix}/;
}
`;

    return config;
}

// Generování upstream konfigurace
function generateUpstreamConfig(devices) {
    let config = '# Upstream konfigurace pro zařízení\n\n';
    
    for (const device of devices) {
        const upstreamName = device.name.replace(/[^a-zA-Z0-9]/g, '_');
        config += `upstream ${upstreamName}_upstream {
    server ${device.target_host}:${device.target_port};
    keepalive 32;
}

`;
    }
    
    return config;
}

// Testování dostupnosti zařízení
async function testDeviceConnection(device) {
    try {
        const response = await axios.get(`http://${device.target_host}:${device.target_port}`, {
            timeout: 5000,
            validateStatus: () => true // Akceptuj jakýkoli status code
        });
        return { success: true, status: response.status, message: 'Zařízení je dostupné' };
    } catch (error) {
        return { success: false, status: 0, message: error.message };
    }
}

// Routes
app.get('/', async (req, res) => {
    try {
        const options = await loadOptions();
        res.render('index', { devices: options.devices, ssl: options.ssl });
    } catch (error) {
        console.error('Chyba při načítání hlavní stránky:', error);
        res.status(500).render('error', { message: 'Chyba při načítání konfigurace' });
    }
});

app.get('/api/devices', async (req, res) => {
    try {
        const options = await loadOptions();
        res.json(options.devices);
    } catch (error) {
        console.error('Chyba při načítání zařízení:', error);
        res.status(500).json({ error: 'Chyba při načítání zařízení' });
    }
});

app.post('/api/devices', async (req, res) => {
    try {
        const options = await loadOptions();
        const newDevice = req.body;
        
        // Validace
        if (!newDevice.name || !newDevice.target_host || !newDevice.target_port) {
            return res.status(400).json({ error: 'Chybí povinná pole' });
        }
        
        // Přidání výchozích hodnot
        newDevice.path_prefix = newDevice.path_prefix || `/${newDevice.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        newDevice.rewrite_paths = newDevice.rewrite_paths !== false;
        newDevice.auth_required = newDevice.auth_required || false;
        
        options.devices.push(newDevice);
        
        if (await saveOptions(options)) {
            res.json({ message: 'Zařízení bylo úspěšně přidáno', device: newDevice });
        } else {
            res.status(500).json({ error: 'Chyba při ukládání zařízení' });
        }
    } catch (error) {
        console.error('Chyba při přidávání zařízení:', error);
        res.status(500).json({ error: 'Chyba při přidávání zařízení' });
    }
});

app.put('/api/devices/:index', async (req, res) => {
    try {
        const options = await loadOptions();
        const index = parseInt(req.params.index);
        const updatedDevice = req.body;
        
        if (index < 0 || index >= options.devices.length) {
            return res.status(404).json({ error: 'Zařízení nebylo nalezeno' });
        }
        
        if (!updatedDevice.name || !updatedDevice.target_host || !updatedDevice.target_port) {
            return res.status(400).json({ error: 'Chybí povinná pole' });
        }
        
        options.devices[index] = updatedDevice;
        
        if (await saveOptions(options)) {
            res.json({ message: 'Zařízení bylo úspěšně upraveno', device: updatedDevice });
        } else {
            res.status(500).json({ error: 'Chyba při ukládání zařízení' });
        }
    } catch (error) {
        console.error('Chyba při upravování zařízení:', error);
        res.status(500).json({ error: 'Chyba při upravování zařízení' });
    }
});

app.delete('/api/devices/:index', async (req, res) => {
    try {
        const options = await loadOptions();
        const index = parseInt(req.params.index);
        
        if (index < 0 || index >= options.devices.length) {
            return res.status(404).json({ error: 'Zařízení nebylo nalezeno' });
        }
        
        const removedDevice = options.devices.splice(index, 1)[0];
        
        if (await saveOptions(options)) {
            res.json({ message: 'Zařízení bylo úspěšně smazáno', device: removedDevice });
        } else {
            res.status(500).json({ error: 'Chyba při mazání zařízení' });
        }
    } catch (error) {
        console.error('Chyba při mazání zařízení:', error);
        res.status(500).json({ error: 'Chyba při mazání zařízení' });
    }
});

app.post('/api/devices/:index/test', async (req, res) => {
    try {
        const options = await loadOptions();
        const index = parseInt(req.params.index);
        
        if (index < 0 || index >= options.devices.length) {
            return res.status(404).json({ error: 'Zařízení nebylo nalezeno' });
        }
        
        const device = options.devices[index];
        const result = await testDeviceConnection(device);
        
        res.json(result);
    } catch (error) {
        console.error('Chyba při testování zařízení:', error);
        res.status(500).json({ error: 'Chyba při testování zařízení' });
    }
});

app.get('/api/reload', async (req, res) => {
    try {
        // Restart nginx
        const { exec } = require('child_process');
        exec('nginx -s reload', (error, stdout, stderr) => {
            if (error) {
                console.error('Chyba při restartování nginx:', error);
                res.status(500).json({ error: 'Chyba při restartování nginx' });
            } else {
                res.json({ message: 'Nginx byl úspěšně restartován' });
            }
        });
    } catch (error) {
        console.error('Chyba při restartování nginx:', error);
        res.status(500).json({ error: 'Chyba při restartování nginx' });
    }
});

// Spuštění serveru
app.listen(PORT, () => {
    console.log(`Management server běží na portu ${PORT}`);
    
    // Načtení a aplikace konfigurace při startu
    loadOptions().then(options => {
        generateNginxConfig(options);
    });
});

module.exports = app;
