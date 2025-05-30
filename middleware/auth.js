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
                        return res.redirect("/user/login?message=Your account has been blocked");
                    });
                }
            })
            .catch(error => {
                console.log("error in userAuth middleware ", error);
                res.status(500).send("internal server error");
            });
    } else {
        res.redirect("/user/login");
    }
};

const adminAuth = async(req, res, next) => {
    try {
        if (!req.session.admin) {
            return res.redirect("/admin/login");
        }
        
        // If we're already on the login page, don't redirect
        if (req.path === '/login') {
            return next();
        }
        console.log(req.session.adminEmail)
    User.find({ email:req.session.adminEmail,isAdmin:true })
            .then(data => {
                console.log()
                if (data) {
                    next();
                } else {
                    console.log("jfjhfjf")
                    req.session.destroy((err) => {
                        if (err) {
                            console.log("Error destroying session:", err);
                        }
                    res.redirect("/admin/login");
                    });
                }
            })
            .catch(error => {
                console.log("Error in adminAuth middleware:", error);
                res.status(500).send("Internal server error");
            });

    } catch (error) {
        console.log("Error in adminAuth middleware:", error);
        res.redirect("/admin/login");
    }
};

module.exports = {
    userAuth,
    adminAuth,
    noCache
}; 