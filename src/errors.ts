import { ErrorName } from "./types";

class ErrorBase<T extends string> extends Error {
  name: T;
  message: string;
  response: any | null;

  constructor({
    name,
    message,
    response,
  }: {
    name: T;
    message: string;
    response: any | null;
  }) {
    super();
    this.name = name;
    this.message = name + ": " + message;
    this.response = response;
  }
}

export class TransitionError extends ErrorBase<ErrorName> {}
