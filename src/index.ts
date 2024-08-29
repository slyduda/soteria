import { watch } from "@vue-reactivity/watch";
import { isRef } from "@vue/reactivity";

import { normalizeArray } from "./utils";
import {
  Stateful,
  StateMachine,
  StateMachineOptions,
  TransitionInstructions,
} from "@olympos/soter";

function evaluateReactiveCondition<T>(
  conditionFunction: any,
  context: T
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

function addReactiveStateMachine<
  StateType,
  TriggerType extends string,
  T extends Stateful<StateType>
>(
  context: T,
  instructions: TransitionInstructions<StateType, TriggerType, T>,
  options?: StateMachineOptions
): T & StateMachine<StateType, TriggerType, T> {
  const wrapper = new StateMachine(context, instructions, {
    ...options,
    conditionEvaluator: evaluateReactiveCondition,
  }); // Set the condition evaluator to the reactive version

  const proxy = new Proxy(
    context as T & StateMachine<StateType, TriggerType, T>,
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
      const conditionFunctions = conditions.map(
        (condition) => proxy[condition]
      );
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
          const effectFunction = proxy[effect];

          // Skip if it isnt a method
          if (typeof effectFunction !== "function") continue;

          // Call function
          effectFunction.call(proxy);
        }

        proxy.state = transition.destination;
      });
    }
  }

  return proxy;
}

export { addReactiveStateMachine };
