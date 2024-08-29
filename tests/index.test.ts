import { expect, test } from "vitest";
import { addReactiveStateMachine } from "../src";
import { computed, ref } from "@vue/reactivity";

test("simple example", () => {
  // Create a composable
  const useMatter = (s: string) => {
    const temperature = ref(0);
    const state = s;

    const canMelt = computed(() => {
      return temperature.value > 40;
    });

    return {
      state,
      temperature,
      canMelt,
    };
  };
  // Merge composable instance with state machine
  const matter = addReactiveStateMachine(useMatter("solid"), {
    melt: { origins: "solid", destination: "liquid", conditions: "canMelt" },
  });

  const { temperature } = matter;
  temperature.value = 50;
  expect(matter.state).toBe("liquid");
});
