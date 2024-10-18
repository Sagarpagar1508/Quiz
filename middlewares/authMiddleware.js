const jwt = require('jsonwebtoken');

// Middleware to authenticate the user
const authenticate = (req, res, next) => {
    try {
        // Get the token from the Authorization header (Expected format: "Bearer <token>")
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ message: 'Unauthorized: No authorization header provided' });
        }

        const token = authHeader.split(' ')[1]; // Split "Bearer <token>"
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        // Verify the token
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({ message: 'Unauthorized: Token expired' });
                }
                return res.status(403).json({ message: 'Forbidden: Invalid token' });
            }

            // Attach decoded user data to the request object
            req.user = decoded;
            next();
        });
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

// Middleware to authorize superAdmin role
const authorizeSuperAdmin = (req, res, next) => {
    // Check if the user has the superAdmin role
    if (req.user.role !== 'superAdmin') {
        return res.status(403).json({ message: 'Access denied: You do not have superAdmin privileges' });
    }
    next();
};

module.exports = { authenticate, authorizeSuperAdmin };
