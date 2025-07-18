"""SnapTrade service for brokerage account integration"""

import logging
from typing import List, Dict, Any, Optional

from snaptrade_client import SnapTrade
from src.core.config import settings

logger = logging.getLogger(__name__)


class SnapTradeService:
    """Service for interacting with SnapTrade API for brokerage account integration"""

    def __init__(self):
        """Initialize SnapTrade service with API credentials"""
        if not settings.snaptrade_client_id or not settings.snaptrade_consumer_key:
            logger.warning("SnapTrade credentials not configured. Service will be disabled.")
            self.enabled = False
            self.client = None
            return

        # Initialize SnapTrade client
        self.client = SnapTrade(
            consumer_key=settings.snaptrade_consumer_key,
            client_id=settings.snaptrade_client_id,
        )

        self.enabled = True
        logger.info(f"SnapTrade service initialized in {settings.snaptrade_environment} mode")

    async def register_user(self, user_id: str) -> Optional[str]:
        """
        Register a new user with SnapTrade

        Args:
            user_id: Unique identifier for the user in your system

        Returns:
            User secret if successful, None if failed
        """
        if not self.enabled:
            logger.error("SnapTrade service is disabled")
            return None

        try:
            response = self.client.authentication.register_snap_trade_user(body={"userId": user_id})

            if response.body and "userSecret" in response.body:
                logger.info(f"Successfully registered SnapTrade user: {user_id}")
                return response.body["userSecret"]
            else:
                logger.error(f"Failed to register user {user_id}: No userSecret in response")
                return None

        except Exception as e:
            logger.error(f"Error registering SnapTrade user {user_id}: {str(e)}")
            return None

    async def generate_connection_url(
        self, user_id: str, user_secret: str, connection_type: str = "read"
    ) -> Optional[str]:
        """
        Generate a connection portal URL for linking brokerage accounts

        Args:
            user_id: SnapTrade user ID
            user_secret: SnapTrade user secret
            connection_type: "read" for read-only, "trade" for trading access

        Returns:
            Connection portal URL if successful, None if failed
        """
        if not self.enabled:
            logger.error("SnapTrade service is disabled")
            return None

        try:
            response = self.client.authentication.login_snap_trade_user(
                query_params={
                    "userId": user_id,
                    "userSecret": user_secret,
                    "connectionType": connection_type,
                }
            )

            if response.body and "redirectURI" in response.body:
                logger.info(f"Generated connection URL for user {user_id}")
                return response.body["redirectURI"]
            else:
                logger.error(f"Failed to generate connection URL for user {user_id}")
                return None

        except Exception as e:
            logger.error(f"Error generating connection URL for user {user_id}: {str(e)}")
            return None

    async def get_user_accounts(self, user_id: str, user_secret: str) -> List[Dict[str, Any]]:
        """
        Get all connected brokerage accounts for a user

        Args:
            user_id: SnapTrade user ID
            user_secret: SnapTrade user secret

        Returns:
            List of account dictionaries
        """
        if not self.enabled:
            logger.error("SnapTrade service is disabled")
            return []

        try:
            response = self.client.account_information.list_user_accounts(
                query_params={"userId": user_id, "userSecret": user_secret}
            )

            accounts = []
            if response.body:
                for account in response.body:
                    accounts.append(
                        {
                            "id": account.get("id"),
                            "name": account.get("name"),
                            "number": account.get("number"),
                            "institution_name": account.get("institution_name"),
                            "sync_status": account.get("sync_status"),
                            "balance": account.get("balance"),
                        }
                    )

            logger.info(f"Retrieved {len(accounts)} accounts for user {user_id}")
            return accounts

        except Exception as e:
            logger.error(f"Error retrieving accounts for user {user_id}: {str(e)}")
            return []

    async def get_account_positions(
        self, user_id: str, user_secret: str, account_id: str
    ) -> List[Dict[str, Any]]:
        """
        Get positions for a specific account

        Args:
            user_id: SnapTrade user ID
            user_secret: SnapTrade user secret
            account_id: SnapTrade account ID

        Returns:
            List of position dictionaries
        """
        if not self.enabled:
            logger.error("SnapTrade service is disabled")
            return []

        try:
            response = self.client.account_information.get_user_account_positions(
                account_id=account_id, user_id=user_id, user_secret=user_secret
            )

            positions = []
            if response.body:
                for position in response.body:
                    symbol_info = position.get("symbol", {})
                    currency_info = position.get("currency", {})

                    positions.append(
                        {
                            "symbol": symbol_info.get("symbol") if symbol_info else None,
                            "description": symbol_info.get("description") if symbol_info else None,
                            "quantity": (
                                float(position.get("quantity", 0))
                                if position.get("quantity")
                                else 0.0
                            ),
                            "average_purchase_price": (
                                float(position.get("average_purchase_price", 0))
                                if position.get("average_purchase_price")
                                else 0.0
                            ),
                            "last_ask_price": (
                                float(position.get("last_ask_price", 0))
                                if position.get("last_ask_price")
                                else 0.0
                            ),
                            "market_value": (
                                float(position.get("market_value", 0))
                                if position.get("market_value")
                                else 0.0
                            ),
                            "currency": (
                                currency_info.get("code", "USD") if currency_info else "USD"
                            ),
                        }
                    )

            logger.info(f"Retrieved {len(positions)} positions for account {account_id}")
            return positions

        except Exception as e:
            logger.error(f"Error retrieving positions for account {account_id}: {str(e)}")
            return []

    async def get_account_balances(
        self, user_id: str, user_secret: str, account_id: str
    ) -> Dict[str, float]:
        """
        Get account balances

        Args:
            user_id: SnapTrade user ID
            user_secret: SnapTrade user secret
            account_id: SnapTrade account ID

        Returns:
            Dictionary with balance information
        """
        if not self.enabled:
            logger.error("SnapTrade service is disabled")
            return {}

        try:
            response = self.client.account_information.get_user_account_balance(
                account_id=account_id, user_id=user_id, user_secret=user_secret
            )

            balances = {}
            if response.body and "balances" in response.body:
                for balance in response.body["balances"]:
                    currency_info = balance.get("currency", {})
                    currency = currency_info.get("code", "USD") if currency_info else "USD"
                    balances[f"cash_{currency}"] = (
                        float(balance.get("cash", 0)) if balance.get("cash") else 0.0
                    )
                    balances[f"buying_power_{currency}"] = (
                        float(balance.get("buying_power", 0))
                        if balance.get("buying_power")
                        else 0.0
                    )

            logger.info(f"Retrieved balances for account {account_id}")
            return balances

        except Exception as e:
            logger.error(f"Error retrieving balances for account {account_id}: {str(e)}")
            return {}

    async def get_account_transactions(
        self,
        user_id: str,
        user_secret: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        accounts: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get transaction history for user accounts

        Args:
            user_id: SnapTrade user ID
            user_secret: SnapTrade user secret
            start_date: Start date for transaction history
            end_date: End date for transaction history
            accounts: Comma-separated account IDs (optional)

        Returns:
            List of transaction dictionaries
        """
        if not self.enabled:
            logger.error("SnapTrade service is disabled")
            return []

        try:
            query_params = {"userId": user_id, "userSecret": user_secret}

            if start_date:
                query_params["startDate"] = start_date.isoformat()
            if end_date:
                query_params["endDate"] = end_date.isoformat()
            if accounts:
                query_params["accounts"] = accounts

            response = self.client.transactions_and_reporting.get_activities(
                query_params=query_params
            )

            transactions = []
            if response.body:
                for transaction in response.body:
                    symbol_info = transaction.get("symbol", {})
                    currency_info = transaction.get("currency", {})

                    transactions.append(
                        {
                            "id": transaction.get("id"),
                            "account_id": transaction.get("account"),
                            "symbol": symbol_info.get("symbol") if symbol_info else None,
                            "type": transaction.get("type"),
                            "description": transaction.get("description"),
                            "quantity": (
                                float(transaction.get("quantity", 0))
                                if transaction.get("quantity")
                                else 0.0
                            ),
                            "price": (
                                float(transaction.get("price", 0))
                                if transaction.get("price")
                                else 0.0
                            ),
                            "currency": (
                                currency_info.get("code", "USD") if currency_info else "USD"
                            ),
                            "trade_date": transaction.get("trade_date"),
                            "settlement_date": transaction.get("settlement_date"),
                        }
                    )

            logger.info(f"Retrieved {len(transactions)} transactions for user {user_id}")
            return transactions

        except Exception as e:
            logger.error(f"Error retrieving transactions for user {user_id}: {str(e)}")
            return []

    async def delete_user(self, user_id: str) -> bool:
        """
        Delete a SnapTrade user and all associated data

        Args:
            user_id: SnapTrade user ID

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled:
            logger.error("SnapTrade service is disabled")
            return False

        try:
            self.client.authentication.delete_snap_trade_user(query_params={"userId": user_id})
            logger.info(f"Successfully deleted SnapTrade user: {user_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting SnapTrade user {user_id}: {str(e)}")
            return False

    def is_enabled(self) -> bool:
        """Check if SnapTrade service is enabled and configured"""
        return self.enabled


# Global service instance
snaptrade_service = SnapTradeService()
