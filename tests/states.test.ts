import { expect, test } from "vitest";
import { addStateMachine } from "../src";
import { MatterState } from "../examples/physics";

test("checks to see if we can make valid transitions with .to()", () => {
  const matter = addStateMachine({ state: "solid" }, ["solid", "liquid"]);
  matter.to("liquid");
  expect(matter.state).toBe("liquid");
});

test("checks to see if invalid transitions throw errors", () => {
  const matter = addStateMachine({ state: "solid" }, [
    "solid",
    "liquid",
  ] as MatterState[]); // Cast simple state list as MatterState list to prevent error on next line

  expect(() => matter.to("plasma")).toThrowError("DestinationInvalid");
});
