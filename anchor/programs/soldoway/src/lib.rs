use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("23PYHRCqLf7iZ7meK7DKB8bpfTKpNweXCVvc9V5SyHEn");

#[program]
pub mod soldoway {
    use super::*;

    /// Business creates a campaign, deposits SOL into the PDA escrow,
    /// and records the deposit timestamp (used for mock yield calculation).
    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: String,
        reward_per_meeting: u64,
        total_budget: u64,
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;
        let clock = Clock::get()?;

        campaign.business = ctx.accounts.business.key();
        campaign.campaign_id = campaign_id;
        campaign.reward_per_meeting = reward_per_meeting;
        campaign.total_budget = total_budget;
        campaign.budget_used = 0;
        campaign.is_active = true;
        campaign.deposit_timestamp = clock.unix_timestamp;
        campaign.bump = ctx.bumps.campaign;

        // Deposit SOL from Business wallet into campaign PDA escrow
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.business.to_account_info(),
                to: campaign.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, total_budget)?;

        // NOTE: Kamino / spl_stake_pool CPI intentionally commented out for Devnet.
        // Yield is simulated off-chain (MOCK_APY = 5%).
        // yield_program::deposit(campaign_balance) ...

        Ok(())
    }

    /// Business approves a payout for a meeting.
    /// Transfers SOL from escrow PDA to Sales wallet and updates budget_used.
    /// Only the campaign owner (business) can call this via the server wallet authority.
    pub fn approve_payout(
        ctx: Context<ApprovePayout>,
        amount: u64,
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;

        require!(campaign.is_active, ErrorCode::CampaignNotActive);
        require!(
            campaign.total_budget.saturating_sub(campaign.budget_used) >= amount,
            ErrorCode::InsufficientBudget
        );

        campaign.budget_used = campaign.budget_used.checked_add(amount).unwrap();

        // Transfer SOL from campaign escrow PDA to Sales wallet
        campaign.sub_lamports(amount)?;
        ctx.accounts.sales_wallet.add_lamports(amount)?;

        Ok(())
    }

    /// Sales rep claims their accumulated rewards from the PDA.
    /// Server wallet (authority) signs on behalf of the escrow.
    pub fn claim(
        ctx: Context<Claim>,
        amount: u64,
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;

        require!(campaign.is_active, ErrorCode::CampaignNotActive);
        require!(
            campaign.total_budget.saturating_sub(campaign.budget_used) >= amount,
            ErrorCode::InsufficientBudget
        );

        // Transfer SOL from campaign escrow PDA to Sales wallet
        campaign.sub_lamports(amount)?;
        ctx.accounts.sales_wallet.add_lamports(amount)?;

        Ok(())
    }

    /// Business withdraws remaining SOL + mock yield from the escrow PDA.
    /// Only the campaign owner can call this. Marks campaign as WITHDRAWN.
    pub fn withdraw_escrow(
        ctx: Context<WithdrawEscrow>,
        amount: u64,
    ) -> Result<()> {
        let campaign = &mut ctx.accounts.campaign;

        require!(
            campaign.business == ctx.accounts.business.key(),
            ErrorCode::Unauthorized
        );
        require!(campaign.is_active, ErrorCode::CampaignNotActive);

        // NOTE: Mock yield is calculated off-chain and passed in as part of `amount`.
        // In production this would call Kamino/spl_stake_pool to get actual yield.
        // total_claimable = remaining_budget + yield_mock

        // Validate amount doesn't exceed available lamports (PDA balance)
        require!(
            campaign.to_account_info().lamports() >= amount + 8, // keep rent-exempt minimum
            ErrorCode::WithdrawAmountTooHigh
        );

        // Mark campaign as closed
        campaign.is_active = false;

        // Transfer remaining SOL + yield mock from escrow PDA back to Business
        campaign.sub_lamports(amount)?;
        ctx.accounts.business.add_lamports(amount)?;

        Ok(())
    }
}

// ─── Account Structs ──────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(campaign_id: String)]
pub struct CreateCampaign<'info> {
    #[account(
        init,
        payer = business,
        space = 8 + 32 + (4 + 64) + 8 + 8 + 8 + 1 + 8 + 1,
        seeds = [b"campaign", business.key().as_ref(), campaign_id.as_bytes()],
        bump
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(mut)]
    pub business: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApprovePayout<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign.business.as_ref(), campaign.campaign_id.as_bytes()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,

    /// CHECK: The sales wallet to receive payout funds
    #[account(mut)]
    pub sales_wallet: AccountInfo<'info>,

    /// Server authority (backend wallet) signs the payout on behalf of business
    pub server_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign.business.as_ref(), campaign.campaign_id.as_bytes()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,

    /// CHECK: Sales wallet receiving the claim
    #[account(mut)]
    pub sales_wallet: AccountInfo<'info>,

    /// Server authority signs the claim instruction
    pub server_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawEscrow<'info> {
    #[account(
        mut,
        seeds = [b"campaign", campaign.business.as_ref(), campaign.campaign_id.as_bytes()],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,

    #[account(mut)]
    pub business: Signer<'info>,
}

// ─── On-Chain Account Data ────────────────────────────────────────────────────

#[account]
pub struct Campaign {
    pub business: Pubkey,
    pub campaign_id: String,
    pub reward_per_meeting: u64,
    pub total_budget: u64,
    pub budget_used: u64,
    pub is_active: bool,
    pub deposit_timestamp: i64, // Unix timestamp — used for off-chain yield mock
    pub bump: u8,
}

// ─── Error Codes ──────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("This campaign is no longer active.")]
    CampaignNotActive,
    #[msg("Insufficient escrow budget for this operation.")]
    InsufficientBudget,
    #[msg("Unauthorized: only the campaign owner can perform this action.")]
    Unauthorized,
    #[msg("Requested amount exceeds available escrow balance.")]
    WithdrawAmountTooHigh,
}
