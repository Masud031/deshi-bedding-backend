const express = require('express');
const { userRegistration, userLoggedIn, userLogout, getAllUsers, deleteUser, updateUserRole, editUserProfile, googleLoggedIn } = require('../user/user.controller');
const verifyToken = require('../middlewere/verifytoken');
const verifyAdmin = require('../middlewere/verifyadmin');

const router = express.Router();

router.post('/register',userRegistration);

router.post('/login',userLoggedIn);

// router.post('/google-login', googleLoggedIn);
router.post("/google-login", googleLoggedIn);


router.post('/logout',userLogout);

//get all users, very token and admin
router.get('/users',verifyToken ,verifyAdmin, getAllUsers);

// Delete user//only admin access//
router.delete('/users/:id',deleteUser,verifyToken ,verifyAdmin);


// update user role(by admin) for testing in postman should remove verifytoken
// and verify admin
router.put('/users/:id',verifyToken ,verifyAdmin, updateUserRole);

//edit user profile(by user)
// edit user profile
router.patch('/edit-profile/:id',verifyToken , editUserProfile)


module.exports = router;



