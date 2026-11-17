const transitions = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  REFUNDED: []
};

export function canTransitionOrder(from, to) {
  return transitions[from]?.includes(to) ?? false;
}
