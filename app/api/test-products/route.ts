import { NextResponse } from 'next/server';
import {
  getProductsForCurrentPangkalan,
  createProductForCurrentPangkalan,
  updateProductForCurrentPangkalan,
  deleteProductForCurrentPangkalan,
} from '@/lib/actions/products';

export async function GET() {
  try {
    console.log('=== TESTING PRODUCT CRUD FUNCTIONS ===');

    // Test 1: Get all products
    console.log('\n1. Testing getProductsForCurrentPangkalan...');
    const productsResult = await getProductsForCurrentPangkalan();
    console.log('Products result:', {
      success: productsResult.success,
      count: productsResult.data?.length || 0,
      error: productsResult.error
    });

    if (productsResult.success && productsResult.data.length > 0) {
      console.log('Sample product:', productsResult.data[0]);
    }

    // Test 2: Create a new product
    console.log('\n2. Testing createProductForCurrentPangkalan...');
    const testProduct = {
      name: 'Test Product ' + Date.now(),
      category: 'gas' as const,
      basePrice: 25000,
      stock: 10,
      unit: 'pcs',
      description: 'Test product for CRUD verification'
    };

    const createResult = await createProductForCurrentPangkalan(testProduct);
    console.log('Create result:', {
      success: createResult.success,
      error: createResult.error,
      data: createResult.data ? {
        id: createResult.data.id,
        name: createResult.data.name,
        price: createResult.data.basePrice,
        stock: createResult.data.stock
      } : null
    });

    // Test 3: Update the created product (if creation was successful)
    if (createResult.success && createResult.data?.id) {
      console.log('\n3. Testing updateProductForCurrentPangkalan...');
      const updateResult = await updateProductForCurrentPangkalan(createResult.data.id, {
        name: testProduct.name + ' (Updated)',
        category: testProduct.category,
        basePrice: 30000,
        stock: 15,
        unit: 'pcs',
        description: 'Updated test product'
      });
      console.log('Update result:', {
        success: updateResult.success,
        error: updateResult.error
      });

      // Test 4: Delete the test product
      console.log('\n4. Testing deleteProductForCurrentPangkalan...');
      const deleteResult = await deleteProductForCurrentPangkalan(createResult.data.id);
      console.log('Delete result:', {
        success: deleteResult.success,
        error: deleteResult.error
      });
    } else {
      console.log('\n3-4. Skipping update/delete tests due to creation failure');
    }

    // Test 5: Verify products list after cleanup
    console.log('\n5. Final verification - get products after cleanup...');
    const finalProductsResult = await getProductsForCurrentPangkalan();
    console.log('Final products count:', finalProductsResult.data?.length || 0);

    return NextResponse.json({
      success: true,
      message: "Product CRUD test completed",
      results: {
        initialProducts: {
          success: productsResult.success,
          count: productsResult.data?.length || 0,
          error: productsResult.error
        },
        createTest: {
          success: createResult.success,
          error: createResult.error,
          productId: createResult.data?.id || null
        },
        finalProducts: {
          success: finalProductsResult.success,
          count: finalProductsResult.data?.length || 0,
          error: finalProductsResult.error
        }
      }
    });

  } catch (error) {
    console.error('Error in product CRUD test:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results: null
    }, { status: 500 });
  }
}