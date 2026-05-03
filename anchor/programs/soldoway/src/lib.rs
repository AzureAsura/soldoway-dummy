use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod soldoway {
    use super::*;

    pub fn create_task(
        ctx: Context<CreateTask>, 
        task_id: String, 
        reward_amount: u64, 
        budget_total: u64
    ) -> Result<()> {
        let task = &mut ctx.accounts.task;
        let clock = Clock::get()?;

        task.business = ctx.accounts.business.key();
        task.task_id = task_id;
        task.reward_amount = reward_amount;
        task.budget_total = budget_total;
        task.budget_used = 0;
        task.is_active = true;
        task.deposit_timestamp = clock.unix_timestamp;
        task.bump = ctx.bumps.task;

        // Deposit SOL ke escrow (langsung disimpan di akun PDA task)
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.business.to_account_info(),
                to: task.to_account_info(),
            },
        );
        system_program::transfer(cpi_context, budget_total)?;

        // Note: Kamino / spl_stake_pool yield integration CPI di-comment out
        // karena kurang relevan/sulit dideploy di Devnet untuk Hackathon tanpa mock.
        // yield_program::deposit(task_balance) ...

        Ok(())
    }

    pub fn update_task(
        ctx: Context<UpdateTask>,
        meeting_id: String,
        notes: String
    ) -> Result<()> {
        let _task = &ctx.accounts.task;
        msg!("Activity logged for meeting: {} with notes: {}", meeting_id, notes);
        Ok(())
    }

    pub fn payout(
        ctx: Context<Payout>, 
        amount: u64
    ) -> Result<()> {
        let task = &mut ctx.accounts.task;

        require!(task.is_active, ErrorCode::TaskNotActive);
        require!(task.budget_total - task.budget_used >= amount, ErrorCode::InsufficientBudget);

        task.budget_used = task.budget_used.checked_add(amount).unwrap();

        // Transfer SOL dari Task Escrow PDA ke Sales Wallet
        task.sub_lamports(amount)?;
        ctx.accounts.sales_wallet.add_lamports(amount)?;

        Ok(())
    }

    pub fn claim(
        ctx: Context<Claim>,
        amount: u64
    ) -> Result<()> {
        let task = &mut ctx.accounts.task;
        // Optionally used if Sales needs to claim accumulated rewards 
        // that were allocated but not transferred during payout.
        
        require!(task.is_active, ErrorCode::TaskNotActive);
        
        // Transfer SOL dari Task Escrow PDA ke Sales Wallet
        task.sub_lamports(amount)?;
        ctx.accounts.sales_wallet.add_lamports(amount)?;

        Ok(())
    }

    pub fn withdraw(
        ctx: Context<Withdraw>,
        amount: u64
    ) -> Result<()> {
        let task = &mut ctx.accounts.task;
        
        require!(task.business == ctx.accounts.business.key(), ErrorCode::Unauthorized);
        
        let remaining = task.budget_total.checked_sub(task.budget_used).unwrap();
        require!(amount <= remaining, ErrorCode::WithdrawAmountTooHigh);

        // Tutup task jika semua sisa budget ditarik
        if amount == remaining {
            task.is_active = false;
        }

        // Transfer sisa SOL dari Task Escrow PDA kembali ke Business Wallet
        task.sub_lamports(amount)?;
        ctx.accounts.business.add_lamports(amount)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(task_id: String)]
pub struct CreateTask<'info> {
    #[account(
        init,
        payer = business,
        space = 8 + 32 + 4 + task_id.len() + 8 + 8 + 8 + 1 + 8 + 1,
        seeds = [b"task", business.key().as_ref(), task_id.as_bytes()],
        bump
    )]
    pub task: Account<'info, Task>,
    
    #[account(mut)]
    pub business: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateTask<'info> {
    #[account(
        mut,
        seeds = [b"task", task.business.as_ref(), task.task_id.as_bytes()],
        bump = task.bump
    )]
    pub task: Account<'info, Task>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Payout<'info> {
    #[account(
        mut,
        seeds = [b"task", task.business.as_ref(), task.task_id.as_bytes()],
        bump = task.bump
    )]
    pub task: Account<'info, Task>,
    
    /// CHECK: The sales wallet to receive funds
    #[account(mut)]
    pub sales_wallet: AccountInfo<'info>,

    // Otorisasi Payout ditandatangani oleh backend wallet
    pub server_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(
        mut,
        seeds = [b"task", task.business.as_ref(), task.task_id.as_bytes()],
        bump = task.bump
    )]
    pub task: Account<'info, Task>,
    
    #[account(mut)]
    pub sales_wallet: Signer<'info>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"task", task.business.as_ref(), task.task_id.as_bytes()],
        bump = task.bump
    )]
    pub task: Account<'info, Task>,
    
    #[account(mut)]
    pub business: Signer<'info>,
}

#[account]
pub struct Task {
    pub business: Pubkey,
    pub task_id: String,
    pub reward_amount: u64,
    pub budget_total: u64,
    pub budget_used: u64,
    pub is_active: bool,
    pub deposit_timestamp: i64,
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("This task is no longer active.")]
    TaskNotActive,
    #[msg("Insufficient escrow budget for payout.")]
    InsufficientBudget,
    #[msg("Unauthorized access to withdraw.")]
    Unauthorized,
    #[msg("Requested withdrawal amount exceeds remaining budget.")]
    WithdrawAmountTooHigh,
}
