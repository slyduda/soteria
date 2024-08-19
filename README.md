# Soteria - Finite State Machine

`Soteria` is a lightweight, object-oriented finite state machine implementation in Javascript. `Soteria` has zero-dependencies and is useful for both frontend and backend applications.

## Installation

```
npm install @olympus/soteria
```

## Quickstart

Here is a simple example of how to leverage `Soteria`:

```ts
const matterMachine = addStateMachine(
  {
    state: "solid",
  },
  {
    melt: { origins: "solid", destination: "liquid" },
    evaporate: { origins: "liquid", destination: "gas" },
  }
);
console.log(matterMachine.state); // solid
matterMachine.trigger("melt"); // Trigger the melt transition
console.log(matterMachine.state); // liquid
```

Here is a class based approach with better type safety:

```ts
type MatterState = "solid" | "liquid" | "gas" | "plasma";
type MatterTrigger =
  | "melt"
  | "evaporate"
  | "sublimate"
  | "ionize"
  | "freeze"
  | "depose"
  | "condense"
  | "recombine";

class Matter {
  state: MatterState;

  constructor(state: MatterState) {
    this.state = state;
  }
}

const matterMachineDict: TransitionDict<MatterState, MatterTrigger, Matter> = {
  melt: { origins: "solid", destination: "liquid" },
  evaporate: { origins: "liquid", destination: "gas" },
  sublimate: { origins: "solid", destination: "gas" },
  ionize: { origins: "gas", destination: "plasma" },
};

// Initialize a Matter object and attach a state machine to it
const matter = addStateMachine(new Matter("solid"), matterMachineDict);
console.log(matter.state); // solid
matter.trigger("melt"); // Trigger the melt transition
console.log(matter.state); // liquid
```

## Concepts

A state machine is a model of behavior composed of a finite number of states and transitions between those states. Within each state and transition some action can be performed. A state machine needs to start at some initial state. Below, we will look at some core concepts and how to work with them.

- `State`: A condition or stage in a state machine. A `State` can describe a phase in a process or a mode of behavior.

- `Transition`: A process or event that causes the state machine to change from one state to another.

- `Model`: An entity that gets updated during transitions. It may also define actions that will be executed during transitions. This is also described as context.

- `Machine`: An entity that manages and controls the model, states, transitions, and actions.

- `Trigger`: An event that initiates a transition, the method that sends the signal to start a transition.

- `Action`: An operation or task that is performed when a certain state is entered, exited, or during a transition.

### Basics

In order to create an object with a state machine, it must be `Stateful`, or having a `.state` property that the machine can reference. Some examples of this are:

```js
// Simple object untyped approach
const matter = {
  state: "solid",
};
```

```ts
// Class based typed approach
type MatterState = "solid" | "liquid" | "gas" | "plasma";
class Matter {
  state: MatterState;

  constructor(state: MatterState) {
    this.state = state;
  }
}
const matter = new Matter("solid");
```

You can create a very simple working state machine bound to `matter` like this:

```ts
import {} from "@olympus/soteria";

const matterMachine = addStateMachine(matter, ["solid", "liquid"]);
```

You can now transition your state machine to any destination listed in the list above:

```ts
matterMachine.to("liquid");
console.log(matterMachine.state); // liquid
```

Calling `addStateMachine` on `matter` creates `matterMachine` which includes all of the base object's properties and methods while also attaching various state machine methods.

## Transitions

### .to(state: StateType)

The `.to()` method is helpful for simple state transitions as demonstrated in the last example. Simply supply a state and if it exists transition to it without any checks or side effects.

```ts
const matter = addStateMachine(
  {
    state: "solid",
  }, // The object
  ["solid", "liquid"] // The available states
);

console.log(matter.state); // solid
matter.to("liquid");
console.log(matter.state); // liquid
```

### .trigger(trigger: TriggerType, options?: TransitionOptions)

In most use cases where finite state machines are needed, it is often helpful to have additional logic that happens before, during, and after transitions. This is where the `.trigger()` method is helpful.

```ts
import { TransitionDict } from "@olympus/soteria";

type HeroState = "idle" | "sleeping";
type HeroTrigger = "patrol" | "sleep";

class Hero {
  state: HeroState;
  energy: number;

  constructor(state: HeroState) {
    this.state = state;
    this.energy = 1;
  }

  work() {
    console.log("The hero is expending energy!");
    this.energy--;
  }

  hasEnergy() {
    return this.energy > 0;
  }
}

const transitionDict: TransitionDict<HeroState, HeroTrigger, Hero> = {
  patrol: {
    origins: "idle",
    destination: "idle",
    conditions: "hasEnergy",
    effects: "work",
  },
  sleep: {
    origins: "idle",
    destination: "sleeping",
  },
};

const hero = addStateMachine(new Hero("idle"), transitionDict);
hero.trigger("patrol");
// The hero is expending energy!
hero.trigger("patrol"); // No log because condition is not met so the hero does not work
```

### Configuration

To be updated
