const User = require("../models/User");
const { USER_EMAIL } = require("../utilities/constants.js");

class AuthDbRepository {
  // Get the single registered user
  static async getUserByEmail() {
    return User.findOne({ email: USER_EMAIL });
  }

  static async getUserByApiToken(apiToken) {
    return User.findOne({ apiToken });
  }

  // Upsert the registered user after Google OAuth
  static async upsertGoogleUser({ email, tokens, apiToken }) {
    if (email !== USER_EMAIL) {
      throw new Error(`Unauthorized user: ${email}`);
    }

    let user = await User.findOne({ email });

    if (user) {
      // Update existing user
      user.google = tokens;
      user.apiToken = apiToken;
      user.updatedAt = new Date();
      await user.save();
    } else {
      // Create the user
      user = await User.create({
        email,
        google: tokens,
        apiToken,
        apiTokenCreatedAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return user;
  }

  static async clearTokens() {
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user) throw new Error("Registered user not found");

    user.google = {};
    user.apiToken = null;
    user.updatedAt = new Date();
    await user.save();

    return user;
  }

  // Update only Google tokens
  static async updateTokens(tokens) {
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user) throw new Error("Registered user not found");

    user.google = tokens;
    user.updatedAt = new Date();
    await user.save();

    return user;
  }

  // Rotate API token
  static async rotateApiToken() {
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user) throw new Error("Registered user not found");

    user.apiToken = generateApiToken();
    user.apiTokenCreatedAt = new Date();
    await user.save();

    return user.apiToken;
  }
}
module.exports = AuthDbRepository;
