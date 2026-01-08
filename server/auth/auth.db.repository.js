const User = require("../models/User");
const { USER_EMAIL } = require("../utilities/constants.js");

class AuthDbRepository {
  // Get the single registered user
  static async getUserByEmail(email) {
    return User.findOne({ email });
  }

  static async getUserByApiTokenHash(apiTokenHash) {
    return User.findOne({ apiTokenHash });
  }

  static async upsertUser(email, tokens, apiTokenHash) {
    let user = await this.getUserByEmail(email);

    if (!user) {
      user = await AuthDbRepository.createUser(email, tokens, apiTokenHash);
    } else {
      user = await AuthDbRepository.updateUser(user, tokens, apiTokenHash);
    }

    return user;
  }

  static async createUser(email, tokens, apiTokenHash) {
    const now = new Date();
    const user = await User.create({
      email,
      google: tokens,
      createdAt: now,
      updatedAt: now,
      apiTokenHash,
      apiTokenCreatedAt: now,
    });

    return user;
  }

  static async updateUser(user, tokens, apiTokenHash) {
    const now = new Date();

    user.google = tokens;
    user.apiTokenHash = apiTokenHash;
    user.apiTokenCreatedAt = now;
    user.updatedAt = now;

    await user.save();
  }

  // Upsert the registered user after Google OAuth
  static async upsertGoogleUser({ email, tokens }) {
    if (email !== USER_EMAIL) {
      throw new Error(`Unauthorized user: ${email}`);
    }

    let user = await User.findOne({ email });

    if (user) {
      // Update existing user
      user.google = tokens;
      user.updatedAt = new Date();
      await user.save();
    } else {
      // Create the user
      user = await User.create({
        email,
        google: tokens,
        updatedAt: new Date(),
      });
    }

    return user;
  }

  static async clearTokens() {
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user) throw new Error("Registered user not found");

    user.google = {};
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

  static async saveApiTokenHash(userId, hashedApiToken) {
    return User.updateOne(
      { _id: userId },
      {
        apiTokenHash: hashedApiToken,
        apiTokenCreatedAt: new Date(),
      }
    );
  }
}
module.exports = AuthDbRepository;
