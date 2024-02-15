export default {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "./tsconfig.json" }],
  },
};
