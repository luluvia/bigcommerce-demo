import { hooks } from '@bigcommerce/stencil-utils';
import CatalogPage from './catalog';
import compareProducts from './global/compare-products';
import FacetedSearch from './common/faceted-search';
import { createTranslationDictionary } from '../theme/common/utils/translations-utils';

const itemsPath = "/items";
const cartPath = "/api/storefront/carts/";

export default class Category extends CatalogPage {
    
    constructor(context) {
        super(context);
        this.validationDictionary = createTranslationDictionary(context);

        var script = document.createElement('script');
        script.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
        script.type = 'text/javascript';
        document.getElementsByTagName('head')[0].appendChild(script);
    }

    setLiveRegionAttributes($element, roleType, ariaLiveStatus) {
        $element.attr({
            role: roleType,
            'aria-live': ariaLiveStatus,
        });
    }

    makeShopByPriceFilterAccessible() {
        if (!$('[data-shop-by-price]').length) return;

        if ($('.navList-action').hasClass('is-active')) {
            $('a.navList-action.is-active').focus();
        }

        $('a.navList-action').on('click', () => this.setLiveRegionAttributes($('span.price-filter-message'), 'status', 'assertive'));
    }

    onReady() {
        this.arrangeFocusOnSortBy();

        $('[data-button-type="add-cart"]').on('click', (e) => this.setLiveRegionAttributes($(e.currentTarget).next(), 'status', 'polite'));

        this.makeShopByPriceFilterAccessible();

        compareProducts(this.context);

        if ($('#facetedSearch').length > 0) {
            this.initFacetedSearch();
        } else {
            this.onSortBySubmit = this.onSortBySubmit.bind(this);
            hooks.on('sortBy-submitted', this.onSortBySubmit);
        }

        $('a.reset-btn').on('click', () => this.setLiveRegionsAttributes($('span.reset-message'), 'status', 'polite'));

        $("button#addAllToCart").on('click', async() => {

            var lineItems = [];

            this.context.categoryProducts.forEach((product) => {
                const basketItem = {
                    "productId": product.id,
                    "quantity": 1
                }
                lineItems.push(basketItem);
            });

            var cart = await $.get(cartPath)
                .done(function(data) {
                    return data;
                })
                .fail(function(xhr, status, error) {
                    console.log("error with status " + status + " and error: ");
                    console.error(error);
                    return xhr.done();
                });
            var cartId = "";
            var urlString = cartPath;
            var data = JSON.stringify({lineItems});
            console.log(data);

            if (cart[0]) {
                 cartId = cart[0].id;
                 urlString = cartPath + cartId + itemsPath;
            }

            $.ajax({
                url: urlString,
                type: 'POST',
                data: data})
                .done(function(data, status, xhr) {
                    console.log("item complete with status " + status);
                })
                .fail(function(xhr, status, error) {
                    console.log("error with status " + status + " and error: ");
                    console.error(error);
                    return xhr.done();
                });

            window.alert("Products from category added to cart");
            window.location.reload();

        });

        $("button#removeAllFromCart").on('click', async() => {

            var cart = await $.get(cartPath)
                .done(function(data) {
                    return data;
                })
                .fail(function(xhr, status, error) {
                    console.log("error with status " + status + " and error: ");
                    console.error(error);
                    return xhr.done();
                });
            var cartId = cart[0].id;
            $.ajax({
                url: cartPath + cartId,
                type: 'DELETE',
                error: function(xhr, status, error) {
                    console.log("error with status " + status + " and error: ");
                    console.error(error);
                    return xhr.done();
                },
                success: function(data, status, xhr) {
                    window.alert("All products removed from cart");
                    window.location.reload();
                }
            });

        });

        this.ariaNotifyNoProducts();
    }

    ariaNotifyNoProducts() {
        const $noProductsMessage = $('[data-no-products-notification]');
        if ($noProductsMessage.length) {
            $noProductsMessage.focus();
        }
    }

    initFacetedSearch() {
        const {
            price_min_evaluation: onMinPriceError,
            price_max_evaluation: onMaxPriceError,
            price_min_not_entered: minPriceNotEntered,
            price_max_not_entered: maxPriceNotEntered,
            price_invalid_value: onInvalidPrice,
        } = this.validationDictionary;
        const $productListingContainer = $('#product-listing-container');
        const $facetedSearchContainer = $('#faceted-search-container');
        const productsPerPage = this.context.categoryProductsPerPage;
        const requestOptions = {
            config: {
                category: {
                    shop_by_price: true,
                    products: {
                        limit: productsPerPage,
                    },
                },
            },
            template: {
                productListing: 'category/product-listing',
                sidebar: 'category/sidebar',
            },
            showMore: 'category/show-more',
        };

        this.facetedSearch = new FacetedSearch(requestOptions, (content) => {
            $productListingContainer.html(content.productListing);
            $facetedSearchContainer.html(content.sidebar);

            $('body').triggerHandler('compareReset');

            $('html, body').animate({
                scrollTop: 0,
            }, 100);
        }, {
            validationErrorMessages: {
                onMinPriceError,
                onMaxPriceError,
                minPriceNotEntered,
                maxPriceNotEntered,
                onInvalidPrice,
            },
        });
    }
}
