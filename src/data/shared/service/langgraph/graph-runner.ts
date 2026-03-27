type GraphStateWithResult<TResult> = {
  result: TResult | null;
};

export async function invokeGraphWithResult<
  TResult,
  TState extends GraphStateWithResult<TResult>,
>(args: {
  invoke: () => Promise<TState>;
  graphName: string;
}): Promise<TResult> {
  const finalState = await args.invoke();
  if (!finalState.result) {
    throw new Error(`[${args.graphName}] Missing finalized result`);
  }

  return finalState.result;
}
