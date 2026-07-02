import { NextFunction, Request, Response, Router } from "express";
import {
  getAuthJsConfig,
  isOAuthProviderConfigured,
} from "./authjs.config";
import { oauthErrorUrl } from "./authjs.service";

const router = Router();

function getSetCookies(headers: Headers) {
  const headersWithCookies = headers as Headers & {
    getSetCookie?: () => string[];
  };
  return headersWithCookies.getSetCookie?.() ?? [];
}

router.get("/oauth-error", (req, res) => {
  const error =
    typeof req.query.error === "string" ? req.query.error : "OAuth failed";
  return res.redirect(oauthErrorUrl(new Error(error)));
});

// Auth.js initiates OAuth with a CSRF-protected POST. This GET bridge keeps
// the frontend's simple provider link while preserving Auth.js CSRF handling.
router.get(
  "/signin/:provider",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = String(req.params.provider).toLowerCase();
      if (!["google", "tiktok"].includes(provider)) {
        return res.redirect(oauthErrorUrl(new Error("Unsupported OAuth provider")));
      }
      if (!isOAuthProviderConfigured(provider)) {
        return res.redirect(
          oauthErrorUrl(new Error(`${provider} OAuth is not configured`)),
        );
      }

      const [{ Auth }, config] = await Promise.all([
        import("@auth/core"),
        getAuthJsConfig(),
      ]);
      const origin = (
        process.env.BACKEND_URL ?? `${req.protocol}://${req.get("host")}`
      ).replace(/\/+$/, "");
      const csrfResponse = await Auth(
        new globalThis.Request(`${origin}/api/auth/csrf`, {
          headers: { cookie: req.headers.cookie ?? "" },
        }),
        config,
      );
      const { csrfToken } = (await csrfResponse.json()) as {
        csrfToken?: string;
      };

      if (!csrfToken) throw new Error("Unable to initialize OAuth request");

      const csrfCookies = getSetCookies(csrfResponse.headers);
      const cookieHeader = csrfCookies
        .map((cookie) => cookie.split(";")[0])
        .join("; ");
      const body = new URLSearchParams({ csrfToken });
      const signInResponse = await Auth(
        new globalThis.Request(`${origin}/api/auth/signin/${provider}`, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            cookie: [req.headers.cookie, cookieHeader].filter(Boolean).join("; "),
          },
          body,
          redirect: "manual",
        }),
        config,
      );

      for (const cookie of [
        ...csrfCookies,
        ...getSetCookies(signInResponse.headers),
      ]) {
        res.append("Set-Cookie", cookie);
      }

      const location = signInResponse.headers.get("location");
      if (!location) throw new Error("OAuth provider did not return a redirect");
      return res.redirect(location);
    } catch (error) {
      return res.redirect(oauthErrorUrl(error));
    }
  },
);

router.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [{ ExpressAuth }, config] = await Promise.all([
      import("@auth/express"),
      getAuthJsConfig(),
    ]);
    return ExpressAuth(config)(req, res, next);
  } catch (error) {
    return next(error);
  }
});

export default router;
