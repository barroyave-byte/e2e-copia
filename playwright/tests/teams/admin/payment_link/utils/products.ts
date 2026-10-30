export const calculateProductsAmount = (products: { productAmount: string }[]) => {
  const totalAmount = products?.reduce(
    (accumulator, product) => accumulator + parseFloat(product.productAmount),
    0
  );
  return totalAmount;
};

export const calculateTotalAmount = (
  products: { productAmount: string }[],
  taxAmount: string,
  shippingAmount: string
) => {
  const totalProductsAmount = calculateProductsAmount(products);
  const totalAmount = totalProductsAmount + parseFloat(taxAmount) + parseFloat(shippingAmount);
  return totalAmount.toString();
};
