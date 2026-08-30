/**
 * HTTP Basic Authentication Middleware for Swagger UI and OpenAPI documentation
 */
const swaggerAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Basic ")) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Road to SDET API Documentation"');
        return res.status(401).send("Authentication required to access API documentation");
    }

    try {
        const credentials = Buffer.from(authHeader.split(" ")[1], "base64").toString("utf-8");
        const separatorIndex = credentials.indexOf(":");
        if (separatorIndex === -1) {
            res.setHeader("WWW-Authenticate", 'Basic realm="Road to SDET API Documentation"');
            return res.status(401).send("Invalid credentials format");
        }

        const username = credentials.substring(0, separatorIndex);
        const password = credentials.substring(separatorIndex + 1);

        const expectedUser = process.env.SWAGGER_USER || "admin";
        const expectedPass = process.env.SWAGGER_PASSWORD || "admin123";

        if (username === expectedUser && password === expectedPass) {
            return next();
        }

        res.setHeader("WWW-Authenticate", 'Basic realm="Road to SDET API Documentation"');
        return res.status(401).send("Invalid username or password for API documentation");
    } catch (error) {
        res.setHeader("WWW-Authenticate", 'Basic realm="Road to SDET API Documentation"');
        return res.status(401).send("Invalid authentication format");
    }
};

module.exports = swaggerAuth;
