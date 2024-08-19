export type ErrorName =
  | "TransitionsUndefined"
  | "ConditionValue"
  | "ConditionUndefined"
  | "TriggerUndefined"
  | "EffectError"
  | "EffectUndefined"
  | "OriginDisallowed"
  | "DestinationInvalid";

type Effect<T> = keyof T; // Ensures only methods of T can be used as effects
type Condition<T> = keyof T; // Ensures only methods of T can be used as conditions

export type Transition<StateType, TriggerType extends string, T> = {
  origins: StateType | StateType[];
  destination: StateType;
  effects?: Effect<T> | Effect<T>[];
  conditions?: Condition<T> | Condition<T>[];
};

export type ConditionAttempt<T> = {
  name: Condition<T>;
  success: boolean;
  context: T | null;
};

export type EffectAttempt<T> = {
  name: Effect<T>;
  success: boolean;
  context: T | null;
};

export type TransitionAttempt<StateType, TriggerType extends string, T> = {
  name: TriggerType;
  success: boolean;
  failure: TransitionFailure<TriggerType, T> | null;
  conditions: ConditionAttempt<T>[];
  effects: EffectAttempt<T>[];
  transition: Transition<StateType, TriggerType, T>;
  context: T | null;
};

export type TransitionFailure<TriggerType extends string, T> = {
  type: ErrorName;
  undefined: boolean;
  trigger: TriggerType | null;
  method: Condition<T> | Effect<T> | null;
  index: number | null;
  context: T | null;
};

export type TransitionResult<StateType, TriggerType extends string, T> = {
  success: boolean; // Whether the Transition was successful or not
  failure: TransitionFailure<TriggerType, T> | null;
  previous: StateType;
  current: StateType;
  transitions: TransitionAttempt<StateType, TriggerType, T>[];
  precontext: T | null;
  context: T | null;
};

export type TransitionDict<StateType, TriggerType extends string, T> = {
  [K in TriggerType]:
    | Transition<StateType, TriggerType, T>
    | Transition<StateType, TriggerType, T>[];
};
export type StateList<StateType> = StateType[];

export interface Stateful<StateType> {
  state: StateType;
}

export type StateMachineOptions = {
  verbosity?: boolean;
  throwExceptions?: boolean;
  strictOrigins?: boolean;
};

export type TransitionOptions = {
  onError?: () => void;
  throwExceptions?: boolean;
};

export type TransitionProps = {};
