$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")

try {
    $listener.Start()
    Write-Host "TroliBijak server running at http://localhost:$port/"
} catch {
    Write-Host "Port $port unavailable: $_"
    exit 1
}

$baseDir = $PSScriptRoot
$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response

        $rawPath = $req.Url.AbsolutePath
        if ($rawPath -eq "/" -or [string]::IsNullOrWhiteSpace($rawPath)) {
            $rawPath = "/index.html"
        }

        $relPath = $rawPath.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar)
        $localPath = Join-Path $baseDir $relPath

        if (Test-Path $localPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $bytes = [System.IO.File]::ReadAllBytes($localPath)

            $res.ContentType = $contentType
            $res.ContentLength64 = $bytes.Length
            $res.AddHeader("Cache-Control", "no-cache")
            $res.AddHeader("Service-Worker-Allowed", "/")
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
        } else {
            $res.StatusCode = 404
            $res.Close()
        }
    }
} finally {
    $listener.Stop()
}

