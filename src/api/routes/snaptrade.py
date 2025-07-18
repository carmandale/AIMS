"""SnapTrade API endpoints for brokerage account integration"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.api.auth import get_current_user, CurrentUser, portfolio_rate_limiter, sensitive_rate_limiter
from src.api.schemas.snaptrade import (
    SnapTradeUserRegistrationRequest,
    SnapTradeUserRegistrationResponse,
    ConnectionURLRequest,
    ConnectionURLResponse,
    AccountsResponse,
    SnapTradeAccount,
    PositionsResponse,
    SnapTradePosition,
    BalancesResponse,
    TransactionsRequest,
    TransactionsResponse,
    SnapTradeTransaction,
    SyncRequest,
    SyncResponse,
    UserDeletionResponse,
    ErrorResponse
)
from src.db import get_db
from src.db.models import SnapTradeUser
from src.services.snaptrade_service import snaptrade_service
from src.utils.encryption import encryption_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/snaptrade", tags=["snaptrade"])


def get_user_secret(db: Session, user_id: str) -> Optional[str]:
    """
    Get decrypted SnapTrade user secret from database
    
    Args:
        db: Database session
        user_id: User ID
        
    Returns:
        Decrypted user secret or None if not found
    """
    snaptrade_user = db.query(SnapTradeUser).filter(
        SnapTradeUser.user_id == user_id,
        SnapTradeUser.is_active == True
    ).first()
    
    if not snaptrade_user:
        return None
    
    try:
        return encryption_service.decrypt(snaptrade_user.snaptrade_user_secret)
    except Exception as e:
        logger.error(f"Error decrypting user secret for {user_id}: {str(e)}")
        return None


@router.post("/register", response_model=SnapTradeUserRegistrationResponse)
async def register_snaptrade_user(
    request: SnapTradeUserRegistrationRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register current user with SnapTrade"""
    
    # Check rate limit
    sensitive_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        # Check if SnapTrade service is enabled
        if not snaptrade_service.is_enabled():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SnapTrade service is not configured"
            )
        
        # Check if user is already registered
        existing_snaptrade_user = db.query(SnapTradeUser).filter(
            SnapTradeUser.user_id == current_user.user_id
        ).first()
        
        if existing_snaptrade_user:
            return SnapTradeUserRegistrationResponse(
                user_secret="[ALREADY_REGISTERED]",  # Don't return actual secret
                status="already_registered"
            )
        
        # Register user with SnapTrade
        user_secret = await snaptrade_service.register_user(current_user.user_id)
        
        if not user_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to register user with SnapTrade"
            )
        
        # Encrypt and store user secret in database
        encrypted_secret = encryption_service.encrypt(user_secret)
        
        snaptrade_user = SnapTradeUser(
            user_id=current_user.user_id,
            snaptrade_user_secret=encrypted_secret,
            sync_status="registered"
        )
        
        db.add(snaptrade_user)
        db.commit()
        db.refresh(snaptrade_user)
        
        logger.info(f"Successfully registered SnapTrade user: {current_user.user_id}")
        
        return SnapTradeUserRegistrationResponse(
            user_secret="[REGISTERED]",  # Don't return actual secret for security
            status="registered"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering SnapTrade user {current_user.user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during user registration"
        )


@router.get("/connect", response_model=ConnectionURLResponse)
async def get_connection_url(
    connection_type: str = "read",
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get SnapTrade connection portal URL for linking brokerage accounts"""
    
    # Check rate limit
    portfolio_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        # Check if SnapTrade service is enabled
        if not snaptrade_service.is_enabled():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SnapTrade service is not configured"
            )
        
        # Get user secret from database
        user_secret = get_user_secret(db, current_user.user_id)
        
        if not user_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be registered with SnapTrade first. Please call /api/snaptrade/register"
            )
        
        # Generate connection URL
        connection_url = await snaptrade_service.generate_connection_url(
            current_user.user_id, user_secret, connection_type
        )
        
        if not connection_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate connection URL"
            )
        
        logger.info(f"Generated connection URL for user {current_user.user_id}")
        
        return ConnectionURLResponse(
            connection_url=connection_url,
            expires_at=None  # SnapTrade doesn't provide expiration info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating connection URL for user {current_user.user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during connection URL generation"
        )


@router.get("/accounts", response_model=AccountsResponse)
async def get_user_accounts(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all connected brokerage accounts for the current user"""
    
    # Check rate limit
    portfolio_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        # Check if SnapTrade service is enabled
        if not snaptrade_service.is_enabled():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SnapTrade service is not configured"
            )
        
        # Get user secret from database
        user_secret = get_user_secret(db, current_user.user_id)
        
        if not user_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be registered with SnapTrade first. Please call /api/snaptrade/register"
            )
        
        # Get user accounts from SnapTrade
        accounts_data = await snaptrade_service.get_user_accounts(
            current_user.user_id, user_secret
        )
        
        accounts = [
            SnapTradeAccount(
                id=account["id"],
                name=account["name"],
                number=account["number"],
                institution_name=account["institution_name"],
                sync_status=account["sync_status"],
                balance=account["balance"]
            )
            for account in accounts_data
        ]
        
        logger.info(f"Retrieved {len(accounts)} accounts for user {current_user.user_id}")
        
        return AccountsResponse(accounts=accounts)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving accounts for user {current_user.user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during account retrieval"
        )


@router.get("/accounts/{account_id}/positions", response_model=PositionsResponse)
async def get_account_positions(
    account_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get positions for a specific account"""
    
    # Check rate limit
    portfolio_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        # Check if SnapTrade service is enabled
        if not snaptrade_service.is_enabled():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SnapTrade service is not configured"
            )
        
        # Get user secret from database
        user_secret = get_user_secret(db, current_user.user_id)
        
        if not user_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be registered with SnapTrade first. Please call /api/snaptrade/register"
            )
        
        # Get account positions from SnapTrade
        positions_data = await snaptrade_service.get_account_positions(
            current_user.user_id, user_secret, account_id
        )
        
        positions = [
            SnapTradePosition(
                symbol=position["symbol"],
                description=position["description"],
                quantity=position["quantity"],
                average_purchase_price=position["average_purchase_price"],
                last_ask_price=position["last_ask_price"],
                market_value=position["market_value"],
                currency=position["currency"]
            )
            for position in positions_data
        ]
        
        logger.info(f"Retrieved {len(positions)} positions for account {account_id}")
        
        return PositionsResponse(positions=positions)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving positions for account {account_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during position retrieval"
        )


@router.get("/accounts/{account_id}/balances", response_model=BalancesResponse)
async def get_account_balances(
    account_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get balances for a specific account"""
    
    # Check rate limit
    portfolio_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        # Check if SnapTrade service is enabled
        if not snaptrade_service.is_enabled():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SnapTrade service is not configured"
            )
        
        # Get user secret from database
        user_secret = get_user_secret(db, current_user.user_id)
        
        if not user_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be registered with SnapTrade first. Please call /api/snaptrade/register"
            )
        
        # Get account balances from SnapTrade
        balances_data = await snaptrade_service.get_account_balances(
            current_user.user_id, user_secret, account_id
        )
        
        logger.info(f"Retrieved balances for account {account_id}")
        
        return BalancesResponse(balances=balances_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving balances for account {account_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during balance retrieval"
        )


@router.get("/transactions", response_model=TransactionsResponse)
async def get_transactions(
    request: TransactionsRequest = Depends(),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get transaction history for the current user"""
    
    # Check rate limit
    portfolio_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        # Check if SnapTrade service is enabled
        if not snaptrade_service.is_enabled():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SnapTrade service is not configured"
            )
        
        # Get user secret from database
        user_secret = get_user_secret(db, current_user.user_id)
        
        if not user_secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be registered with SnapTrade first. Please call /api/snaptrade/register"
            )
        
        # Get transactions from SnapTrade
        transactions_data = await snaptrade_service.get_account_transactions(
            current_user.user_id,
            user_secret,
            start_date=request.start_date,
            end_date=request.end_date,
            accounts=request.accounts
        )
        
        transactions = [
            SnapTradeTransaction(
                id=transaction["id"],
                account_id=transaction["account_id"],
                symbol=transaction["symbol"],
                type=transaction["type"],
                description=transaction["description"],
                quantity=transaction["quantity"],
                price=transaction["price"],
                currency=transaction["currency"],
                trade_date=transaction["trade_date"],
                settlement_date=transaction["settlement_date"]
            )
            for transaction in transactions_data
        ]
        
        logger.info(f"Retrieved {len(transactions)} transactions for user {current_user.user_id}")
        
        return TransactionsResponse(transactions=transactions)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving transactions for user {current_user.user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during transaction retrieval"
        )


@router.post("/sync", response_model=SyncResponse)
async def sync_data(
    request: SyncRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Trigger data synchronization from SnapTrade"""
    
    # Check rate limit
    sensitive_rate_limiter.check_rate_limit(current_user.user_id)
    
    try:
        # This endpoint would trigger a background sync process
        # For now, return a placeholder response
        
        logger.info(f"Data sync requested for user {current_user.user_id}")
        
        return SyncResponse(
            status="initiated",
            message="Data synchronization has been initiated",
            synced_at=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Error initiating sync for user {current_user.user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during sync initiation"
        )


@router.delete("/users/{user_id}", response_model=UserDeletionResponse)
async def delete_snaptrade_user(
    user_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete SnapTrade user and all associated data"""
    
    # Check rate limit
    sensitive_rate_limiter.check_rate_limit(current_user.user_id)
    
    # Verify user can only delete their own data
    if current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own SnapTrade data"
        )
    
    try:
        # Check if SnapTrade service is enabled
        if not snaptrade_service.is_enabled():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SnapTrade service is not configured"
            )
        
        # Delete user from SnapTrade
        success = await snaptrade_service.delete_user(user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete user from SnapTrade"
            )
        
        logger.info(f"Successfully deleted SnapTrade user: {user_id}")
        
        return UserDeletionResponse(
            status="deleted",
            message="SnapTrade user and all associated data have been deleted"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting SnapTrade user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during user deletion"
        )
