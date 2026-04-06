/**
 * Revera Auto - Production Server
 * 
 * Express.js server with clean URL routing, gzip compression,
 * security headers, and static asset caching.
 * 
 * Usage:
 *   npm start          (production)
 *   npm run dev         (development)
 * 
 * Then visit: http://localhost:3000
 */

const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const isProd = process.env.NODE_ENV === 'production';

// ============================================================
// Middleware: Gzip Compression (reduces response size ~70%)
// ============================================================
app.use(compression());

// ============================================================
// Middleware: Security Headers
// ============================================================
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (isProd) {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// ============================================================
// Middleware: Redirect .html URLs to clean URLs (301)
// ============================================================
app.use((req, res, next) => {
    // Skip non-GET requests
    if (req.method !== 'GET') return next();

    const urlPath = req.path;

    // Redirect /index.html to /
    if (urlPath === '/index.html') {
        const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        return res.redirect(301, '/' + query);
    }

    // Redirect any .html URL to clean URL
    if (urlPath.endsWith('.html')) {
        const cleanPath = urlPath.slice(0, -5); // Remove .html
        const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        const hash = '';
        return res.redirect(301, cleanPath + query + hash);
    }

    // Remove trailing slash (except for root /)
    if (urlPath.length > 1 && urlPath.endsWith('/')) {
        const cleanPath = urlPath.slice(0, -1);
        const query = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        return res.redirect(301, cleanPath + query);
    }

    next();
});

// ============================================================
// Middleware: Serve clean URLs by mapping to .html files
// ============================================================
app.use((req, res, next) => {
    // Skip non-GET requests
    if (req.method !== 'GET') return next();

    const urlPath = req.path;

    // Skip URLs that already have a file extension (CSS, JS, images, etc.)
    if (path.extname(urlPath)) return next();

    // Skip the root path (handled by index.html below)
    if (urlPath === '/') return next();

    // Try to find a matching .html file
    const htmlFilePath = path.join(ROOT_DIR, urlPath + '.html');

    if (fs.existsSync(htmlFilePath) && fs.statSync(htmlFilePath).isFile()) {
        return res.sendFile(htmlFilePath);
    }

    // Check if there's an index.html in the directory
    const indexPath = path.join(ROOT_DIR, urlPath, 'index.html');
    if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
        return res.sendFile(indexPath);
    }

    next();
});

// ============================================================
// Serve static files with caching (CSS, JS, images, etc.)
// ============================================================
app.use(express.static(ROOT_DIR, {
    extensions: ['html'], // Try .html extension for extensionless requests
    index: 'index.html',
    maxAge: isProd ? '30d' : 0, // Cache static assets for 30 days in production
    etag: true,
    lastModified: true
}));

// ============================================================
// 404 Handler
// ============================================================
app.use((req, res) => {
    const notFoundPage = path.join(ROOT_DIR, '404.html');
    if (fs.existsSync(notFoundPage)) {
        res.status(404).sendFile(notFoundPage);
    } else {
        res.status(404).sendFile(path.join(ROOT_DIR, 'index.html'));
    }
});

// ============================================================
// Start Server
// ============================================================
app.listen(PORT, () => {
    console.log(`\n🚀 Revera Auto Server`);
    console.log(`   Mode: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`   Running at: http://localhost:${PORT}`);
    console.log(`\n📋 Clean URL Routing Active:`);
    console.log(`   /about-us.html  →  301 →  /about-us`);
    console.log(`   /contact-us.html  →  301 →  /contact-us`);
    console.log(`   /index.html  →  301 →  /`);
    if (isProd) {
        console.log(`\n🔒 Production optimizations enabled:`);
        console.log(`   ✓ Gzip compression`);
        console.log(`   ✓ Security headers`);
        console.log(`   ✓ Static asset caching (30 days)`);
    }
    console.log(`\n   Press Ctrl+C to stop\n`);
});
