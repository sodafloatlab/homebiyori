function handler(event) {
    const request = event.request;
    const uri = request.uri;
    
    // Skip API requests - they should go to API Gateway
    if (uri.startsWith('/api/')) {
        return request;
    }
    
    // If URI is root or ends with '/', append 'index.html'
    if (uri === '/' || uri.endsWith('/')) {
        request.uri = uri + 'index.html';
    }
    // If URI is a directory path without trailing slash (and not a file)
    else if (!uri.includes('.') && uri !== '/') {
        request.uri = uri + '/index.html';
    }
    
    return request;
}