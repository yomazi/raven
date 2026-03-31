export const cookifyApiToken = (res, apiToken) => {
  if (apiToken) {
    res.cookie("apiToken", apiToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });
  }
};
