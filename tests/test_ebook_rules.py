"""
Unit & Integration Test Suite for EbookGenZ
Validates core business rules, pricing calculation, and download security guards.
"""

import pytest

from ebook_services import (
    AccessDeniedError,
    CartItem,
    DownloadLink,
    EBookItem,
    OrderSecurityGuard,
    ShoppingCart,
    ValidationError,
)


@pytest.fixture
def clean_code_book():
    return EBookItem(
        ebook_id=1,
        title="Clean Code in Practice",
        price=350.00,
        category_id=1,
        is_active=True,
    )


@pytest.fixture
def ai_engineering_book():
    return EBookItem(
        ebook_id=2,
        title="AI Engineering Handbook",
        price=420.00,
        category_id=2,
        is_active=True,
    )


class TestEBookItemValidation:
    """Tests data validation on E-Book items."""

    def test_valid_ebook_creation(self, clean_code_book):
        assert clean_code_book.title == "Clean Code in Practice"
        assert clean_code_book.price == 350.00
        assert clean_code_book.is_active is True

    def test_reject_negative_price(self):
        with pytest.raises(ValidationError, match="price cannot be negative"):
            EBookItem(ebook_id=99, title="Invalid Book", price=-50.0, category_id=1)

    def test_reject_empty_title(self):
        with pytest.raises(ValidationError, match="title cannot be empty"):
            EBookItem(ebook_id=99, title="   ", price=200.0, category_id=1)


class TestShoppingCartLogic:
    """Tests shopping cart subtotal and total calculations."""

    def test_cart_empty_initial_state(self):
        cart = ShoppingCart(user_id=1)
        assert cart.total_amount == 0.0
        assert cart.total_items_count == 0

    def test_add_items_calculates_correct_subtotal(self, clean_code_book):
        cart = ShoppingCart(user_id=1)
        cart.add_item(clean_code_book, quantity=2)
        assert cart.total_amount == 700.00
        assert cart.total_items_count == 2

    def test_add_multiple_different_books(self, clean_code_book, ai_engineering_book):
        cart = ShoppingCart(user_id=1)
        cart.add_item(clean_code_book, quantity=1)  # 350
        cart.add_item(ai_engineering_book, quantity=2)  # 840
        assert cart.total_amount == 1190.00
        assert cart.total_items_count == 3

    def test_reject_adding_inactive_ebook(self):
        inactive_book = EBookItem(ebook_id=3, title="Archived Book", price=100.0, category_id=1, is_active=False)
        cart = ShoppingCart(user_id=1)
        with pytest.raises(ValidationError, match="Cannot add inactive E-Book"):
            cart.add_item(inactive_book, quantity=1)

    def test_remove_item_from_cart(self, clean_code_book, ai_engineering_book):
        cart = ShoppingCart(user_id=1)
        cart.add_item(clean_code_book, quantity=1)
        cart.add_item(ai_engineering_book, quantity=1)
        cart.remove_item(clean_code_book.ebook_id)
        assert cart.total_amount == 420.00
        assert cart.total_items_count == 1

    def test_update_quantity_to_zero_removes_item(self, clean_code_book):
        cart = ShoppingCart(user_id=1)
        cart.add_item(clean_code_book, quantity=2)
        cart.update_quantity(clean_code_book.ebook_id, quantity=0)
        assert cart.total_items_count == 0
        assert cart.total_amount == 0.0

    def test_cart_item_rejects_non_positive_quantity(self, clean_code_book):
        with pytest.raises(ValidationError, match="Quantity must be greater than zero"):
            CartItem(ebook=clean_code_book, quantity=0)

    def test_cart_add_item_rejects_non_positive_quantity(self, clean_code_book):
        cart = ShoppingCart(user_id=1)
        with pytest.raises(ValidationError, match="Quantity to add must be positive"):
            cart.add_item(clean_code_book, quantity=-1)

    def test_add_existing_ebook_accumulates_quantity(self, clean_code_book):
        cart = ShoppingCart(user_id=1)
        cart.add_item(clean_code_book, quantity=1)
        cart.add_item(clean_code_book, quantity=2)
        assert cart.total_items_count == 3
        assert cart.total_amount == 1050.00

    def test_update_quantity_positive(self, clean_code_book):
        cart = ShoppingCart(user_id=1)
        cart.add_item(clean_code_book, quantity=1)
        cart.update_quantity(clean_code_book.ebook_id, quantity=4)
        assert cart.total_items_count == 4
        assert cart.total_amount == 1400.00

    def test_apply_valid_discount(self, clean_code_book):
        cart = ShoppingCart(user_id=1)
        cart.add_item(clean_code_book, quantity=2)  # 700
        discounted = cart.apply_discount(10.0)  # 10% off = 70 off => 630
        assert discounted == 630.00

    def test_apply_invalid_discount_raises_error(self, clean_code_book):
        cart = ShoppingCart(user_id=1)
        cart.add_item(clean_code_book, quantity=1)
        with pytest.raises(ValidationError, match="Invalid discount percentage"):
            cart.apply_discount(-5.0)
        with pytest.raises(ValidationError, match="Invalid discount percentage"):
            cart.apply_discount(150.0)


class TestDownloadSecurityGuard:
    """Tests critical security requirement: only confirmed orders can access downloads."""

    @pytest.fixture
    def sample_link(self):
        return DownloadLink(
            download_id=101,
            order_id=501,
            ebook_id=1,
            download_token="sec_token_abc123",
            download_count=0,
            max_downloads=5,
        )

    def test_denies_download_when_order_is_pending(self, sample_link):
        with pytest.raises(AccessDeniedError, match="Download locked. Order status is 'pending'"):
            OrderSecurityGuard.can_access_download("pending", sample_link)

    def test_denies_download_when_order_is_cancelled(self, sample_link):
        with pytest.raises(AccessDeniedError, match="Download locked. Order status is 'cancelled'"):
            OrderSecurityGuard.can_access_download("cancelled", sample_link)

    def test_allows_download_when_order_is_confirmed(self, sample_link):
        assert OrderSecurityGuard.can_access_download("confirmed", sample_link) is True

    def test_increments_download_counter_on_success(self, sample_link):
        assert sample_link.download_count == 0
        OrderSecurityGuard.record_download("confirmed", sample_link)
        assert sample_link.download_count == 1
        OrderSecurityGuard.record_download("confirmed", sample_link)
        assert sample_link.download_count == 2

    def test_blocks_download_when_max_downloads_quota_reached(self, sample_link):
        sample_link.download_count = 5  # reached maximum 5
        with pytest.raises(AccessDeniedError, match="Download quota exceeded"):
            OrderSecurityGuard.can_access_download("confirmed", sample_link)

    def test_invalid_order_status_raises_validation_error(self, sample_link):
        with pytest.raises(ValidationError, match="Invalid order status"):
            OrderSecurityGuard.can_access_download("unknown_status", sample_link)
