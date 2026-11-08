import { test, expect } from '@playwright/test';

test.describe('Shopping cart and checkout', () => {
  // Log in before each test so every test starts on the Products page.
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('username').fill('standard_user');
    await page.getByTestId('password').fill('secret_sauce');
    await page.getByTestId('login-button').click();
    await expect(page.getByTestId('title')).toHaveText('Products');
  });

  test('adding items updates the cart badge', async ({ page }) => {
    await page.getByTestId('add-to-cart-sauce-labs-backpack').click();
    await expect(page.getByTestId('shopping-cart-badge')).toHaveText('1');

    await page.getByTestId('add-to-cart-sauce-labs-bike-light').click();
    await expect(page.getByTestId('shopping-cart-badge')).toHaveText('2');

    // The button flips to "Remove"; clicking it takes the item out again.
    await page.getByTestId('remove-sauce-labs-backpack').click();
    await expect(page.getByTestId('shopping-cart-badge')).toHaveText('1');
  });

  test('sorting by price low to high', async ({ page }) => {
    await page.getByTestId('product-sort-container').selectOption('lohi');

    const prices = await page.getByTestId('inventory-item-price').allTextContents();
    const numbers = prices.map((p) => Number(p.replace('$', '')));
    const sorted = [...numbers].sort((a, b) => a - b);

    expect(numbers).toEqual(sorted);
  });

  test('complete a full checkout', async ({ page }) => {
    await page.getByTestId('add-to-cart-sauce-labs-backpack').click();
    await page.getByTestId('shopping-cart-link').click();

    // Cart page. The URL changes before the cart renders, so wait for the
    // cart's own title, then look for items only inside the cart list.
    // (The Products page also has "inventory-item-name" elements, 6 of them.)
    await expect(page).toHaveURL(/cart\.html/);
    await expect(page.getByTestId('title')).toHaveText('Your Cart');
    const cartItems = page.getByTestId('cart-list').getByTestId('inventory-item-name');
    await expect(cartItems).toHaveText(['Sauce Labs Backpack']);
    await page.getByTestId('checkout').click();

    // Step one: your information
    await page.getByTestId('firstName').fill('Test');
    await page.getByTestId('lastName').fill('User');
    await page.getByTestId('postalCode').fill('10110');
    await page.getByTestId('continue').click();

    // Step two: overview
    await expect(page).toHaveURL(/checkout-step-two\.html/);
    await expect(page.getByTestId('subtotal-label')).toHaveText('Item total: $29.99');
    await page.getByTestId('finish').click();

    // Done
    await expect(page.getByTestId('complete-header')).toHaveText('Thank you for your order!');
  });

  test('checkout requires a first name', async ({ page }) => {
    await page.getByTestId('shopping-cart-link').click();
    await page.getByTestId('checkout').click();
    await page.getByTestId('continue').click();

    await expect(page.getByTestId('error')).toContainText('First Name is required');
  });
});
