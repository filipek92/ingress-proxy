# Ingress Proxy - Home Assistant Add-on

Pokročilý proxy server pro přístup k lokálním zařízením v síti prostřednictvím Home Assistant Ingress systému.

## ✨ Funkce

- 🌐 **Reverse proxy** pro místní zařízení přes nginx
- 🔄 **Automatické přepisování cest** v HTML obsahu pomocí Lua
- 🔐 **Basic HTTP autentizace** pro zabezpečené zařízení
- 📱 **Responzivní webové rozhraní** pro správu zařízení
- 🔧 **Vlastní HTTP hlavičky** pro každé zařízení
- 🏠 **Home Assistant ingress** kompatibilita
- ⚡ **Minimalizace HTTP hlaviček** pro řešení chyby 414
- 🔍 **Test konektivity** zařízení přímo z UI

## Instalace

1. Přidejte tento repozitář do Home Assistant Add-on Store
2. Nainstalujte addon "Ingress Proxy"
3. Konfigurujte zařízení podle níže uvedených instrukcí
4. Spusťte addon

## Konfigurace

### Základní konfigurace zařízení

```yaml
devices:
  - name: "Router"
    target_host: "192.168.1.1"
    target_port: 80
    path_prefix: "/router"
    rewrite_paths: true
    auth_required: false
    custom_headers:
      - "X-Forwarded-For: $remote_addr"
  - name: "NAS"
    target_host: "192.168.1.100"
    target_port: 5000
    path_prefix: "/nas"
    rewrite_paths: true
    auth_required: true
    basic_auth_user: "admin"
    basic_auth_pass: "password"
```

### Parametry zařízení

- **name**: Název zařízení (povinné)
- **target_host**: IP adresa nebo hostname cílového zařízení (povinné)
- **target_port**: Port cílového zařízení (povinné)
- **path_prefix**: Cesta pod kterou bude zařízení dostupné (volitelné, výchozí: `/název_zařízení`)
- **rewrite_paths**: Přepisování cest v obsahu (volitelné, výchozí: `true`)
- **auth_required**: Vyžadovat autentizaci (volitelné, výchozí: `false`)
- **basic_auth_user**: Uživatelské jméno pro Basic Auth (volitelné)
- **basic_auth_pass**: Heslo pro Basic Auth (volitelné)
- **custom_headers**: Seznam vlastních HTTP hlaviček (volitelné)

### SSL konfigurace

```yaml
ssl: true
certfile: fullchain.pem
keyfile: privkey.pem
```

### Úroveň logování

```yaml
log_level: info  # debug, info, warning, error
```

## Přepisování cest

Addon automaticky přepisuje cesty v následujících typech obsahu:

### HTML
- `href` atributy v odkazech
- `src` atributy v obrázcích a skriptech
- `action` atributy ve formulářích

### CSS
- `url()` funkce
- `@import` pravidla

### JavaScript
- `fetch()` volání
- `XMLHttpRequest` požadavky
- `location.href` přesměrování

## Použití

1. Po spuštění addonu se webové rozhraní otevře automaticky
2. Klikněte na "Přidat nové zařízení" pro konfiguraci prvního zařízení
3. Vyplňte požadované údaje a klikněte na "Uložit"
4. Zařízení bude dostupné na adrese: `http://homeassistant.local:8123/api/hassio_ingress/[token]/[path_prefix]`

## Webové rozhraní

Addon poskytuje intuitivní webové rozhraní pro:

- Přidávání nových zařízení
- Úpravu existujících zařízení
- Testování připojení k zařízením
- Odstranění zařízení
- Restartování Nginx

## Řešení problémů

### HTTP 414 "Request-URI Too Large"
Tato chyba se může objevit u zařízení, která mají problém s dlouhými HTTP hlavičkami, což je časté v ingress prostředí Home Assistant.

**Řešení:**
1. V konfiguraci zařízení zapněte **"Minimalizovat HTTP hlavičky"**
2. Rozšířená minimalizace provádí následující optimalizace:

**Server-side hlavičky:**
- Odstraní volitelné hlavičky: `X-Forwarded-Host`, `X-Forwarded-Port`
- Zachová základní: `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`

**Client-side optimalizace:**
- Zvětší proxy buffery: `proxy_buffer_size 8k`, `proxy_buffers 16 8k`
- Odstraní problematické hlavičky: `Accept-Encoding`, `Cookie`
- Nastaví jednoduchý `User-Agent: "HA-Proxy"`

**Globální nginx nastavení:**
- Zvětší buffery pro klientské hlavičky: `large_client_header_buffers 8 16k`
- Maximální velikost těla požadavku: `client_max_body_size 100M`

### Zařízení není dostupné
1. Zkontrolujte IP adresu a port
2. Použijte funkci "Test" v webovém rozhraní
3. Zkontrolujte síťové připojení mezi HA a zařízením

### Problémy s přepisováním cest
1. Zkuste vypnout `rewrite_paths` pokud zařízení správně funguje v podsložce
2. Zkontrolujte logy nginx: `/var/log/nginx/error.log`

### Autentizace nefunguje
1. Ujistěte se, že jsou vyplněna pole `basic_auth_user` a `basic_auth_pass`
2. Restartujte addon po změně autentizačních údajů

## Logy

Logy jsou dostupné v Home Assistant:
- Supervisor → Add-ons → Ingress Proxy → Log

## Podpora

Pro hlášení chyb a požadavky na funkce použijte GitHub Issues.

## Licence

MIT License - viz LICENSE soubor
