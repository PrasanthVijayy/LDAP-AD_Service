import hpp from "hpp";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";

export const corsOptions = {
  origin: ["*"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "X-Requested-With"],
  credentials: true,
};

// app.use((req, res, next) => {
//   res.locals.nonce = CryptoJS.lib.WordArray.random(16).toString(
//     CryptoJS.enc.Hex
//   ); // Generates a random nonce
//   next();
// });

export const securityHeaders = (app) => {
  app.use(
    helmet.hsts({
      maxAge: 31536000, // 1 year
      includeSubDomains: true, // Include subdomains
      preload: true, // Preload HSTS header
    })
  );

  app.use(helmet.xssFilter()); // XSS Protection
  app.use(helmet.noSniff()); // No MIME sniffing
  app.use(helmet.frameguard({ action: "deny" })); // Clickjacking guard
  app.use(helmet.referrerPolicy({ policy: "no-referrer" })); // Referrer policy
  app.use(helmet.dnsPrefetchControl({ allow: false })); // Disable DNS prefetch
  app.use(helmet.permittedCrossDomainPolicies({ permittedPolicies: "none" })); // No cross-domain policies
  app.disable("x-powered-by"); // Hide tech stack
  app.use(hpp()); // Prevent param pollution
  app.use(compression()); // Compress responses
  app.use(cookieParser()); // Parse cookies

  app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Origin-Agent-Cluster", "?0");
    res.setHeader(
      "Cache-Control",
      "private, no-cache, no-store, must-revalidate"
    );
    res.setHeader("Expires", "0");
    res.setHeader("Pragma", "no-cache");

    // Custom CSP Header - instead using in Helmet (This works)
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self'; " +
        "img-src 'self' data:; " +
        "font-src 'self'; " +
        "connect-src 'self'; "
    );
    next();
  });
};
