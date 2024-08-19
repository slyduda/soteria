import { TransitionError } from "./errors";
import type {
  ConditionAttempt,
  EffectAttempt,
  TransitionDict,
  Stateful,
  StateMachineOptions,
  Transition,
  TransitionAttempt,
  TransitionFailure,
  TransitionOptions,
  TransitionProps,
  TransitionResult,
  StateList,
} from "./types";
import { normalizeArray } from "./utils";

class StateMachineWrapper<
  StateType,
  TriggerType extends string,
  T extends Stateful<StateType>
> {
  private context: T;
  private transitions: TransitionDict<StateType, TriggerType, T> | null;
  private states: StateList<StateType>;
  private verbosity: boolean;
  private throwExceptions: boolean;
  private strictOrigins: boolean;

  constructor(
    context: T,
    blueprint: TransitionDict<StateType, TriggerType, T> | StateList<StateType>,
    options?: StateMachineOptions
  ) {
    const {
      verbosity = false,
      throwExceptions = true,
      strictOrigins = false,
    } = options ?? {};

    this.context = context;
    if (Array.isArray(blueprint)) {
      this.states = blueprint;
      this.transitions = null;
    } else {
      this.states = this.getStatesFromTransitionDict(blueprint);
      this.transitions = blueprint;
    }
    this.state = context.state; // Directly set the state from context
    this.verbosity = verbosity;
    this.throwExceptions = throwExceptions;
    this.strictOrigins = strictOrigins; // Whether a called trigger will fail if state is not in origin
  }

  get state(): StateType {
    return this.context.state;
  }

  set state(state: StateType) {
    this.context.state = state;
  }

  private getStatesFromTransitionDict(
    dict: TransitionDict<StateType, TriggerType, T>
  ): StateList<StateType> {
    const states = new Set<StateType>();
    const transitions = Object.values<
      | Transition<StateType, TriggerType, T>
      | Transition<StateType, TriggerType, T>[]
    >(dict);
    for (let i = 0; i < transitions.length; i++) {
      const transitionList = normalizeArray(transitions[i]);
      transitionList.forEach((transition) => {
        states.add(transition.destination);
        const origins = normalizeArray(transition.origins);
        origins.forEach((origin) => {
          states.add(origin);
        });
      });
    }
    return new Array(...states);
  }

  private deepCopyContext(): T {
    return JSON.parse(JSON.stringify(this.context));
  }

  to(state: StateType) {
    if (!this.states.includes(state)) {
      const message = `Destination ${state} is not included in the list of existing states`;
      throw new TransitionError({
        name: "DestinationInvalid",
        message,
        response: null,
      });
    }
    this.state = state;
  }

  triggerWithOptions(
    trigger: TriggerType,
    props: TransitionProps,
    options: TransitionOptions
  ): TransitionResult<StateType, TriggerType, T>;
  triggerWithOptions(
    trigger: TriggerType,
    options: TransitionOptions
  ): TransitionResult<StateType, TriggerType, T>;

  triggerWithOptions(
    trigger: TriggerType,
    secondParameter?: TransitionProps,
    thirdParameter?: TransitionOptions
  ): TransitionResult<StateType, TriggerType, T> {
    let passedProps = undefined;
    let passedOptions = undefined;

    if (thirdParameter !== undefined) {
      passedProps = secondParameter;
      passedOptions = thirdParameter;
    } else {
      // Cast sinve we know it will be Trigger Options
      passedOptions = secondParameter;
    }

    const options = passedOptions ?? {};
    const props = passedProps ?? {};

    return this.trigger(trigger, props, options);
  }

  trigger(
    trigger: TriggerType,
    props?: TransitionProps,
    options?: TransitionOptions
  ): TransitionResult<StateType, TriggerType, T> {
    const response: TransitionResult<StateType, TriggerType, T> = {
      success: false,
      failure: null,
      previous: this.context.state,
      current: this.context.state,
      transitions: [],
      precontext: this.deepCopyContext(),
      context: this.deepCopyContext(),
    };

    const { onError, throwExceptions }: TransitionOptions = options ?? {};

    if (!this.transitions) {
      const context = this.deepCopyContext();
      const failure: TransitionFailure<TriggerType, T> = {
        type: "TransitionsUndefined",
        undefined: true,
        trigger,
        method: null,
        index: null,
        context,
      };
      response.failure = failure;
      response.context = context;

      const message = `trigger("${trigger}") called, but machine does not have transitions defined.`;
      if (throwExceptions || this.throwExceptions)
        throw new TransitionError({
          name: "TransitionsUndefined",
          message,
          response,
        });
      if (this.verbosity) console.info(message);

      return response;
    }

    const transitions = normalizeArray(this.transitions[trigger]);

    // If the transitions don't exist trigger key did not exist
    if (!transitions.length) {
      const context = this.deepCopyContext();
      const failure: TransitionFailure<TriggerType, T> = {
        type: "TriggerUndefined",
        undefined: true,
        trigger,
        method: null,
        index: null,
        context,
      };
      response.failure = failure;
      response.context = context;

      const message = `Trigger "${trigger}" is not defined in the machine.`;
      if (throwExceptions || this.throwExceptions)
        throw new TransitionError({
          name: "TriggerUndefined",
          message,
          response,
        });
      if (this.verbosity) console.info(message);

      return response;
    }

    // Get a set of all origins
    const origins = Array.from(
      transitions.reduce(
        (acc: Set<StateType>, curr: Transition<StateType, TriggerType, T>) => {
          normalizeArray(curr.origins).forEach((item) => acc.add(item));
          return acc;
        },
        new Set()
      )
    );

    // If the transition picked does not have the current state listed in any origins
    if (!origins.includes(this.state)) {
      const message = `Invalid transition from ${this.state} using trigger ${trigger}`;
      if (throwExceptions || this.throwExceptions)
        throw new TransitionError({
          name: "OriginDisallowed",
          message,
          response,
        });
      if (this.verbosity) console.info(message);

      const context = this.deepCopyContext();
      const failure: TransitionFailure<TriggerType, T> = {
        type: "OriginDisallowed",
        undefined: false,
        trigger,
        method: null,
        index: null,
        context,
      };
      response.failure = failure;
      response.context = context;

      return response;
    }

    transitionLoop: for (let i = 0; i < transitions.length; i++) {
      const transition = transitions[i];
      const nextTransition: Transition<StateType, TriggerType, T> | undefined =
        transitions?.[i + 1];

      const transitionAttempt: TransitionAttempt<StateType, TriggerType, T> = {
        name: trigger,
        success: false,
        failure: null,
        conditions: [],
        effects: [],
        transition,
        context: this.deepCopyContext(),
      };
      response.transitions.push(transitionAttempt);

      const effects = normalizeArray(transition.effects || []);
      const conditions = normalizeArray(transition.conditions || []);

      // Loop through all conditions
      for (let j = 0; j < conditions.length; j++) {
        const condition = conditions[j];
        const conditionFunction = this.context[condition];

        // Create the Condition attempt
        const conditionAttempt: ConditionAttempt<T> = {
          name: condition,
          success: false,
          context: this.deepCopyContext(),
        };
        transitionAttempt.conditions.push(conditionAttempt);

        // Check if the method is of type function
        if (typeof conditionFunction !== "function") {
          const message = `Condition ${String(
            condition
          )} is not defined in the machine.`;

          const context = this.deepCopyContext();
          const failure: TransitionFailure<TriggerType, T> = {
            type: "ConditionUndefined",
            undefined: true,
            trigger,
            method: condition,
            index: j,
            context,
          };
          response.failure = failure;
          response.context = context;

          if (throwExceptions || this.throwExceptions)
            throw new TransitionError({
              name: "ConditionUndefined",
              message,
              response,
            });
          if (this.verbosity) console.info(message);
          return response;
        }

        // Check if method passes falsey
        if (!conditionFunction.call(this.context)) {
          const message = `Condition ${String(
            condition
          )} false, transition aborted.`;

          const context = this.deepCopyContext();
          const failure: TransitionFailure<TriggerType, T> = {
            type: "ConditionValue",
            undefined: false,
            trigger,
            method: condition,
            index: j,
            context,
          };

          if (this.verbosity) console.info(message);

          if (nextTransition) {
            transitionAttempt.failure = failure;
            continue transitionLoop;
          } else {
            transitionAttempt.failure = failure;
            response.failure = failure;
            response.context = context;
            return response;
          }
        }

        // Set the attempt to success once the checks have been made
        conditionAttempt.success = true;
      }

      // Loop through all effects
      for (let j = 0; j < effects.length; j++) {
        const effect = effects[j];
        const effectFunction = this.context[effect];

        // Create the Effect attempt
        const effectAttempt: EffectAttempt<T> = {
          name: effect,
          success: false,
          context: this.deepCopyContext(),
        };
        transitionAttempt.effects.push(effectAttempt);

        // Check if the method is of type function
        if (typeof effectFunction !== "function") {
          const message = `Effect ${String(
            effect
          )} is not defined in the machine.`;

          const context = this.deepCopyContext();
          const failure: TransitionFailure<TriggerType, T> = {
            type: "EffectUndefined",
            undefined: true,
            trigger,
            method: effect,
            index: j,
            context,
          };
          response.failure = failure;
          response.context = context;

          if (throwExceptions || this.throwExceptions)
            throw new TransitionError({
              name: "EffectUndefined",
              message,
              response,
            });
          if (this.verbosity) console.info(message);
          return response;
        }
        try {
          effectFunction.call(this.context, props);
        } catch (e) {
          const message = `Effect ${String(effect)} caused an error.`;

          const context = this.deepCopyContext();
          const failure: TransitionFailure<TriggerType, T> = {
            type: "EffectError",
            undefined: false,
            trigger,
            method: effect,
            index: j,
            context,
          };
          response.failure = failure;
          response.context = context;

          if (throwExceptions || this.throwExceptions)
            throw new TransitionError({
              name: "EffectError",
              message,
              response,
            });
          if (this.verbosity) console.warn(message);

          // Call onError
          // This can be some kind of rollback function that resets the state of your object
          // Otherwise effects may change the state of your objects
          if (onError) onError();

          return response;
        }

        effectAttempt.success = true;
      }

      // Change the state to the destination state
      this.state = transition.destination;
      if (this.verbosity) console.info(`State changed to ${this.state}`);

      transitionAttempt.success = true;

      response.success = true;
      response.context = this.deepCopyContext();
      response.current = this.context.state;

      break transitionLoop;
    }
    return response;
  }
}

export function addStateMachine<
  StateType extends string,
  TriggerType extends string,
  T extends Stateful<StateType>
>(
  context: T,
  blueprint: TransitionDict<StateType, TriggerType, T> | StateList<StateType>,
  options?: StateMachineOptions
): T & StateMachineWrapper<StateType, TriggerType, T> {
  const wrapper = new StateMachineWrapper(context, blueprint, options);

  const proxy = new Proxy(
    context as T & StateMachineWrapper<StateType, TriggerType, T>,
    {
      get(target, prop, receiver) {
        if (prop in wrapper) {
          return Reflect.get(wrapper, prop, receiver);
        }
        return Reflect.get(target, prop, receiver);
      },
    }
  );

  return proxy;
}
