import { TransitionInstructions } from "@olympos/soter";
import { ref, computed, Ref, ComputedRef } from "@vue/reactivity";

export type MatterState = "solid" | "liquid" | "gas" | "plasma";
export type MatterTrigger = "melt";

type Matter = {
  state: Ref<MatterState>;
  temperature: Ref<number>;
  effected: Ref<boolean>;
  canMelt: ComputedRef<boolean>;
};

export const useMatter = (s: MatterState): Matter => {
  const temperature = ref(0);
  const effected = ref(false);
  const state = ref(s);

  const canMelt = computed(() => {
    return temperature.value > 40;
  });

  return {
    state,
    effected,
    temperature,
    canMelt,
  };
};

export const matterMachineDict: TransitionInstructions<
  Matter,
  MatterState,
  MatterTrigger
> = {
  melt: [{ origins: "solid", destination: "liquid", conditions: "canMelt" }],
};
