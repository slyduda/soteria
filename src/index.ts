import { watch } from "@vue-reactivity/watch";
import { isRef, Ref } from "@vue/reactivity";

import { normalizeArray } from "./utils";
import {
  StateMachine,
  StateMachineOptions,
  TransitionInstructions,
} from "@olympos/soter";

type ReactiveStateful<StateType> = {
  state: Ref<StateType>;
};

function evaluateReactiveCondition<Context>(
  conditionFunction: any,
  context: Context
): boolean {
  if (typeof conditionFunction === "function") {
    return conditionFunction.call(context);
  } else if (
    conditionFunction &&
    typeof conditionFunction === "object" &&
    "value" in conditionFunction
  ) {
    return Boolean(conditionFunction.value);
  } else {
    return Boolean(conditionFunction);
  }
}

function getReactiveState<
  Context extends ReactiveStateful<StateType>,
  StateType
>(context: Context, key: keyof ReactiveStateful<StateType>): StateType {
  return context[key].value;
}

function setReactiveState<
  Context extends ReactiveStateful<StateType>,
  StateType
>(context: Context, state: StateType, key: keyof ReactiveStateful<StateType>) {
  context[key].value = state;
}

function addReactiveStateMachine<
  StateType,
  TriggerType extends string,
  Context extends ReactiveStateful<StateType>
>(
  context: Context,
  instructions: TransitionInstructions<StateType, TriggerType, Context>,
  options?: StateMachineOptions<
    StateType,
    Context,
    ReactiveStateful<StateType>,
    "state"
  >
): Context &
  StateMachine<
    StateType,
    TriggerType,
    ReactiveStateful<StateType>,
    "state",
    Context
  > {
  const wrapper = new StateMachine<
    StateType,
    TriggerType,
    ReactiveStateful<StateType>,
    "state",
    Context
  >(context, instructions, {
    key: "state",
    ...options,
    conditionEvaluator: evaluateReactiveCondition,
    getState: getReactiveState,
    setState: setReactiveState,
  }); // Set the condition evaluator to the reactive version

  const proxy = new Proxy(
    context as Context &
      StateMachine<
        StateType,
        TriggerType,
        ReactiveStateful<StateType>,
        "state",
        Context
      >,
    {
      get(target, prop, receiver) {
        if (prop in wrapper) {
          return Reflect.get(wrapper, prop, receiver);
        }
        return Reflect.get(target, prop, receiver);
      },
    }
  );

  for (const trigger in instructions) {
    const transitions = normalizeArray(instructions[trigger]);
    for (const transition of transitions) {
      const conditions = normalizeArray(transition.conditions ?? []);
      const conditionFunctions = conditions
        .map((condition) => proxy[condition as keyof Context]) // TODO DANGEROUS MAYBE CAST AS UNDEFINED
        .filter((condition) => condition !== undefined);
      watch([...conditionFunctions], () => {
        const conditionsMet = conditionFunctions.every((conditionFunction) =>
          isRef(conditionFunction)
            ? conditionFunction.value === true
            : typeof conditionFunction === "function"
            ? conditionFunction.call(proxy) === true
            : conditionFunction
        );

        if (!conditionsMet) return;

        for (const effect of normalizeArray(transition.effects ?? [])) {
          // Define Effect Function
          const effectFunction = proxy[effect as keyof Context]; // TODO DANGEROUS MAYBE CAST AS UNDEFINED

          // Skip if it isnt a method
          if (typeof effectFunction !== "function") continue;

          // Call function
          effectFunction.call(proxy);
        }

        proxy.state.value = transition.destination;
      });
    }
  }

  return proxy;
}

export { addReactiveStateMachine };
