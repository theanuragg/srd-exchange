export type Hex = `0x${string}`;

type UserOperationBase = {
  sender: Hex;
  nonce: Hex;
  callData: Hex;
  callGasLimit: Hex;
  verificationGasLimit: Hex;
  preVerificationGas: Hex;
  maxFeePerGas: Hex;
  maxPriorityFeePerGas: Hex;
  signature: Hex;
  [key: string]: unknown;
};

export type UserOperationV06 = UserOperationBase & {
  initCode: Hex;
  paymasterAndData: Hex;
};

export type UserOperationV07 = UserOperationBase & {
  factory?: Hex;
  factoryData?: Hex;
  paymaster?: Hex;
  paymasterData?: Hex;
  paymasterVerificationGasLimit?: Hex;
  paymasterPostOpGasLimit?: Hex;
};

export type UserOperation = UserOperationV06 | UserOperationV07;

export const isHexString = (value: unknown): value is Hex => {
  return typeof value === "string" && /^0x[0-9a-fA-F]*$/.test(value);
};

export const isEntryPointV07UserOperation = (
  userOp: UserOperation | Record<string, unknown>
): userOp is UserOperationV07 => {
  return (
    "paymaster" in userOp ||
    "paymasterData" in userOp ||
    "factory" in userOp ||
    "factoryData" in userOp
  );
};

export const sanitizeUnsignedUserOperation = (
  userOp: UserOperation
): UserOperation => {
  if (isEntryPointV07UserOperation(userOp)) {
    return {
      ...userOp,
      paymaster: "0x",
      paymasterData: "0x",
      paymasterVerificationGasLimit: "0x0",
      paymasterPostOpGasLimit: "0x0",
    };
  }

  return {
    ...userOp,
    paymasterAndData: "0x",
  };
};
