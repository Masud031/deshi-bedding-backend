const { Schema, model } = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  //  mobile: { type: String, required:true,unique:true },
   email: {
    type: String,
    unique: true,
    sparse: true, // prevents unique index errors when missing
    required: function () {
      return !this.mobile; // required only if no mobile
    },
  },
  // ✅ Make mobile optional if email exists
  mobile: {
    type: String,
    unique: true,
    sparse: true,
    required: function () {
      return !this.email; // required only if no email
    },
  },
  password: {
    type: String,
    required: function () {
      return this.provider !== "google"; // Password is required only if not using Google
    },
  },

  provider: { type: String, default: "custom" }, // Add provider field
  profileImage: { type: String, default: "" },
  bio: { type: String, maxLength: 200 },
  profession: String,
  role: { type: String, default: "user" },
  createdAt: { type: Date, default: Date.now },
});


// hash password
userSchema.pre('save', async function (next) {
  const user = this;
  if(!user.isModified('password')) return next();
  const hashedPassword =  await bcrypt.hash(user.password, 10);
  user.password = hashedPassword;

  next();
})

// compare password
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

const User = model('User', userSchema);

module.exports = User;
