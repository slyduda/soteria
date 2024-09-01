import { expect, test } from "vitest";
import { machine } from "../src";
import { computed, ref } from "@vue/reactivity";

test("simple example", () => {
  // Create a composable
  const useMatter = (s: string) => {
    const temperature = ref(0);
    const state = ref(s);

    const canMelt = computed(() => {
      return temperature.value > 40;
    });

    const canEvaporate = computed(() => {
      return temperature.value > 100;
    });

    const canSublimate = computed(() => {
      return temperature.value > 100;
    });

    const canIonize = computed(() => {
      return temperature.value > 1000;
    });

    return {
      state,
      temperature,
      canMelt,
      canEvaporate,
      canSublimate,
      canIonize,
    };
  };
  // Merge composable instance with state machine
  const matter = machine(useMatter("solid"), {
    fromSolid: [
      { origins: "solid", destination: "gas", conditions: "canSublimate" },
      { origins: "solid", destination: "liquid", conditions: "canMelt" },
    ],
    fromLiquid: [
      { origins: "liquid", destination: "gas", conditions: "canEvaporate" },
    ],
    fromGas: [
      { origins: "gas", destination: "plasma", conditions: "canIonize" },
    ],
  });

  const { temperature } = matter;
  temperature.value = 101;
  expect(matter.state.value).toBe("gas");
});
