import { runTests } from "./runner";

runTests()
  .then(() => {
    console.log("\n✨ All tests completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Tests failed:", error);
    process.exit(1);
  });