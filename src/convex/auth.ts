// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { DataModel } from "./_generated/dataModel";

const authConfig = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        return {
          email: params.email as string,
          name: params.email as string,
          authEmail: params.email as string,
        };
      },
    }),
    Anonymous,
  ],
});

export const { auth, signIn, signOut, store } = authConfig;