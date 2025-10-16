const generateToken = require("../middlewere/generatetoken");
const User = require("../user/user.model");
const JWT_SECRET = process.env.JWT_SECRET_KEY;
const { successResponse, errorResponse } = require("./responsHandler");

// User registration
const userRegistration = async (req, res) => {

  try {
    const { username, email,mobile, password, provider, profileImage } = req.body;
    if (!email && !mobile) {
      return res.status(400).send({ message: "Email or mobile number is required" });
    }

     // Check if user exists by email or mobile
    let existingUser;
      if (email) existingUser = await User.findOne({ email });
    if (!existingUser && mobile) existingUser = await User.findOne({ mobile });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists!" });
    }

        let user;
    // ✅ Google registration
    if (provider === "google") {
      user = new User({
        username,  // Use the provided Google username
        email,
        password: "google-auth",  // Dummy password for Google login
        provider,
        profileImage: profileImage || "https://i.ibb.co/2kR9YxW/avatar.png", // Fallback to default image if none provided
      });
    }

     // ✅ Mobile registration
    else if (mobile && !email) {
      user = new User({
        username,
        mobile,
        password,
      });
    }

    // ✅ Normal email/password registration
    else {
      user = new User({
        username,
        email,
        password,
        profileImage: profileImage || "https://i.ibb.co/2kR9YxW/avatar.png",
      });
    }

    await user.save();
    res.status(200).send({ message: "Registration successful!" });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).send({ message: "Validation Error", error: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).send({ message: "Duplicate Key Error", error: error.keyValue });
    }
    console.error("Error registering a user: ", error);
    res.status(500).send({ message: "Registration failed!" });
  }
};

// User login
const userLoggedIn = async (req, res) => {
  try {

    const { email, mobile,password} = req.body;
   console.log("📥 Login request body:", { email, mobile, password });
   
     let query = { provider: "custom" };

    if (email) query.email = email;
    else if (mobile) query.mobile = mobile;
    else return res.status(400).json({ message: "Email or mobile number is required" });

    const user = await User.findOne(query);

     if (!user) {
      console.log("❌ No matching user found for:", { email, mobile });
      return res.status(404).json({ message: "User not found or not allowed to login with password!" });
    }

 

    // Generate JWT token
    const token = await generateToken(user._id);

    // Set token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });


    // Send response
    return res.status(200).json({
      message: "Logged in successfully!",
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        profileImage: user.profileImage || "https://i.ibb.co/2kR9YxW/avatar.png",
        bio: user.bio,
        profession: user.profession,
      },
    });

  } catch (error) {
    console.error("Error logging in user:", error);
    return res.status(500).json({ message: "Login failed!" });
  }
};



// google logged-in//
const jwt = require("jsonwebtoken");

const googleLoggedIn = async (req, res) => {

  
  const { username, email, provider, profileImage } = req.body;
  console.log("Google Login Body:", req.body);
  try {
      const normalizedEmail = email?.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail});

    if (!user) {
      user = new User({
         username: username || `GoogleUser-${Date.now()}`,
         email: normalizedEmail,
        password: "google-auth",
        provider: provider || "google",
        profileImage, // Google image comes here
      });
      await user.save();
    } else {
      // 🔁 Update existing user's profileImage if provider is google
      if (provider === "google" && profileImage && user.profileImage !== profileImage) {
        user.profileImage = profileImage;
        await user.save();
      }
    }

     if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    res.status(200).json({
      message: "Google login successful!",
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({ message: "Server error during Google login" });
  }
};




// User logout
const userLogout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    });

    res.status(200).send({ message: "Logout successful!" });
  } catch (error) {
    res.status(500).send({ message: "Logout failed", error });
  }
};


// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    successResponse(res, 200, "All users fetched successfully", users);
  } catch (error) {
    errorResponse(res, 500, "Failed to fetch users", error);
  }
};

// Delete user
const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return errorResponse(res, 404, "User not found!");
    }

    return successResponse(res, 200, "User deleted successfully!");
  } catch (error) {
    errorResponse(res, 500, "Failed to delete user!", error);
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    );

    if (!updatedUser) {
      return errorResponse(res, 404, "User not found!");
    }

    return successResponse(res, 200, "User role updated successfully!", updatedUser);
  } catch (error) {
    errorResponse(res, 500, "Failed to update user role!", error);
  }
};

// Edit user profile
const editUserProfile = async (req, res) => {
  const { id } = req.params;
  const { username, profileImage, bio, profession } = req.body;

  try {
    const updateFields = { username, profileImage, bio, profession };
    const updatedUser = await User.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return errorResponse(res, 404, "User not found!");
    }

    return successResponse(res, 200, "User profile updated successfully!", {
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      profileImage: updatedUser.profileImage,
      bio: updatedUser.bio,
      profession: updatedUser.profession,
    });
  } catch (error) {
    errorResponse(res, 500, "Failed to update user profile!", error);
  }
};



module.exports = {
  userRegistration,
  userLoggedIn,
  userLogout,
  getAllUsers,
  deleteUser,
  updateUserRole,
  editUserProfile,
  googleLoggedIn,
  
 
};

