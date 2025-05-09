const userAuth = (req, res, next) => {
    try {
        if (req.session.user) {
            next();
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.redirect('/login');
    }
};

const adminAuth = (req, res, next) => {
    try {
        if (req.session.admin) {
            next();
        } else {
            res.redirect('/admin/login');
        }
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        res.redirect('/admin/login');
    }
};

module.exports = {
    userAuth,
    adminAuth
}; 