import { createRealmContext } from "@realm/react";
import { Betting, Users, Draws, Combinations, Combination, Commission, Configuration, Messages, Conversation, Cashflow } from "./Models";

export const realmContext = createRealmContext({
    schema: [
      Betting,
      Messages,
      Conversation,
      Commission,
      Cashflow,
      Users,
      Draws,
      Combinations,
      Combination,
      Configuration
    ],
    schemaVersion: 0
  });
  