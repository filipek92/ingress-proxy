local cjson = require("cjson")
local http = require("socket.http")

local _M = {}

-- Funkce pro přepisování cest v HTML obsahu
function _M.rewrite_html_paths(content, original_prefix, new_prefix)
    if not content or not original_prefix or not new_prefix then
        return content
    end
    
    -- Přepisování relativních cest
    content = string.gsub(content, 'href="/', 'href="' .. new_prefix .. '/')
    content = string.gsub(content, "href='/", "href='" .. new_prefix .. "/")
    content = string.gsub(content, 'src="/', 'src="' .. new_prefix .. '/')
    content = string.gsub(content, "src='/", "src='" .. new_prefix .. "/")
    content = string.gsub(content, 'action="/', 'action="' .. new_prefix .. '/')
    content = string.gsub(content, "action='/", "action='" .. new_prefix .. "/")
    
    -- Přepisování absolutních cest
    content = string.gsub(content, 'href="' .. original_prefix, 'href="' .. new_prefix)
    content = string.gsub(content, "href='" .. original_prefix, "href='" .. new_prefix)
    content = string.gsub(content, 'src="' .. original_prefix, 'src="' .. new_prefix)
    content = string.gsub(content, "src='" .. original_prefix, "src='" .. new_prefix)
    content = string.gsub(content, 'action="' .. original_prefix, 'action="' .. new_prefix)
    content = string.gsub(content, "action='" .. original_prefix, "action='" .. new_prefix)
    
    return content
end

-- Funkce pro přepisování cest v CSS obsahu
function _M.rewrite_css_paths(content, original_prefix, new_prefix)
    if not content or not original_prefix or not new_prefix then
        return content
    end
    
    -- Přepisování URL v CSS
    content = string.gsub(content, 'url%("/', 'url("' .. new_prefix .. '/')
    content = string.gsub(content, "url%('/", "url('" .. new_prefix .. "/")
    content = string.gsub(content, 'url%(/', 'url(' .. new_prefix .. '/')
    
    -- Přepisování @import cest
    content = string.gsub(content, '@import "/', '@import "' .. new_prefix .. '/')
    content = string.gsub(content, "@import '/", "@import '" .. new_prefix .. "/")
    
    return content
end

-- Funkce pro přepisování cest v JavaScript obsahu
function _M.rewrite_js_paths(content, original_prefix, new_prefix)
    if not content or not original_prefix or not new_prefix then
        return content
    end
    
    -- Přepisování fetch calls
    content = string.gsub(content, 'fetch%("/', 'fetch("' .. new_prefix .. '/')
    content = string.gsub(content, "fetch%('/", "fetch('" .. new_prefix .. "/")
    
    -- Přepisování XMLHttpRequest
    content = string.gsub(content, '%.open%("GET", "/', '.open("GET", "' .. new_prefix .. '/')
    content = string.gsub(content, "%.open%('GET', '/", ".open('GET', '" .. new_prefix .. "/")
    content = string.gsub(content, '%.open%("POST", "/', '.open("POST", "' .. new_prefix .. '/')
    content = string.gsub(content, "%.open%('POST', '/", ".open('POST', '" .. new_prefix .. "/")
    
    -- Přepisování lokace
    content = string.gsub(content, 'location%.href = "/', 'location.href = "' .. new_prefix .. '/')
    content = string.gsub(content, "location%.href = '/", "location.href = '" .. new_prefix .. "/")
    
    return content
end

-- Hlavní funkce pro přepisování obsahu
function _M.rewrite_content(content, content_type, original_prefix, new_prefix)
    if not content or not content_type or not original_prefix or not new_prefix then
        return content
    end
    
    content_type = string.lower(content_type)
    
    if string.find(content_type, "text/html") then
        return _M.rewrite_html_paths(content, original_prefix, new_prefix)
    elseif string.find(content_type, "text/css") then
        return _M.rewrite_css_paths(content, original_prefix, new_prefix)
    elseif string.find(content_type, "application/javascript") or string.find(content_type, "text/javascript") then
        return _M.rewrite_js_paths(content, original_prefix, new_prefix)
    end
    
    return content
end

-- Funkce pro úpravu response headers
function _M.rewrite_response_headers(headers, original_prefix, new_prefix)
    if not headers then
        return headers
    end
    
    -- Přepisování Location header pro redirecty
    if headers["location"] then
        headers["location"] = string.gsub(headers["location"], "^" .. original_prefix, new_prefix)
    end
    
    -- Přepisování Set-Cookie cest
    if headers["set-cookie"] then
        headers["set-cookie"] = string.gsub(headers["set-cookie"], "Path=" .. original_prefix, "Path=" .. new_prefix)
    end
    
    return headers
end

return _M
