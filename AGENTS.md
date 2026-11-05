# Project decisions

- The "Who Owes Me" ledger (`public.debts`) is merchant-entered only: unpaid orders are NOT auto-imported into it. Keeping it manual avoids double-counting money the orders page already tracks as pending payment.
