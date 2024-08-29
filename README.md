# Soteria - Reactive Finite State Machine

`Soteria` is a lightweight, object-oriented **reactive** finite state machine implementation in Javascript. `Soteria` builds upon the functionality of `Soter` and exposes a new reactive mixin. `Soteria` uses @vue/reactivity under the hood.

## Installation

```
npm install @olympos/soteria
```

## Quickstart

Here is a simple example of how to leverage `Soteria`:

```ts
import { addReactiveStateMachine } from "@olympos/soteria";
import { computed, ref } from "@vue/reactivity";

// Create a composable
const useMatter = (s: string) => {
  const state = s;
  const temperature = ref(0);

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

console.log(matter.state); // solid
const { temperature } = matter;
temperature.value = 50;
console.log(matter.state); // liquid
```
