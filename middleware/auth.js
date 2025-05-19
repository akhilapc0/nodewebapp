const User = require('../models/userSchema');

// Cache control middleware
const noCache = (req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Expires', '0');
    res.set('Pragma', 'no-cache');
    next();
};

const userAuth = (req, res, next) => {
    if (req.session.user) {
        User.findById(req.session.user)
            .then(data => {
                if (data && !data.isBlocked) {
                    next();
                } else {
                    req.session.destroy((err) => {
                        if (err) {
                            console.log("session destruction error", err.message);
                            return res.redirect("/pageNotFound");
                        }
                        return res.redirect("/login?message=Your account has been blocked");
                    });
                }
            })
            .catch(error => {
                console.log("error in userAuth middleware ", error);
                res.status(500).send("internal server error");
            });
    } else {
        res.redirect("/login");
    }
};

const adminAuth = (req, res, next) => {
    if (req.session.admin) {
        User.findOne({ isAdmin: true })
            .then(data => {
                if (data) {
                    next();
                } else {
                    res.redirect("/admin/login");
                }
            })
            .catch(error => {
                console.log("error in admin Auth middleware", error);
                res.status(500).send("internal server error");
            });
    } else {
        res.redirect("/admin/login");
    }
};

module.exports = {
    userAuth,
    adminAuth,
    noCache
}; 