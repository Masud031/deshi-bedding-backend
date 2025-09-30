const { Schema, model } = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: function () {
      return this.provider !== "google"; // Password is required only if not using Google
    },
  },
  // provider: { type: String, required: true, default: "email" }, // Add provider field
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
