import type { NextPage } from 'next'
import { makeStyles } from '@mui/styles'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  Grid,
  InputLabel,
  Input,
  Theme,
  TableContainer,
  Table,
  TableCell,
  TableHead,
  TableRow,
  TableBody,
  tableCellClasses,
  Tab,
  Tabs,
  Typography,
  Chip,
} from '@mui/material'
import Layout from '../components/Layout'
import { colors } from '@components/muiTheme'
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from '@solana/wallet-adapter-react'
import { ChangeEvent, useEffect, useState } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-material-ui'
import { useSnackbar } from 'notistack'
import { getPythTokenBalance } from './api/getPythTokenBalance'
import { STAKING_PROGRAM } from '@components/constants'
import { Wallet } from '@project-serum/anchor'
import {
  StakeAccount,
  StakeConnection,
} from '../../staking-ts/src/StakeConnection'

const useStyles = makeStyles((theme: Theme) => ({
  sectionContainer: {
    paddingTop: 127,
    paddingBottom: 127,
  },
  card: {
    backgroundColor: theme.palette.primary.main,
    maxWidth: 600,
    margin: 'auto',
  },
  cardBlack: {
    maxWidth: 600,
    margin: 'auto',
  },
  form: {
    '& .MuiFormControl-root': { marginBottom: 30 },
  },
  amountInputLabel: {
    marginTop: 6,
    '& .MuiInputLabel-root': {
      color: 'white',
      '&.Mui-focused': {
        color: colors.white,
      },
    },
  },
  amountInput: {
    '& .MuiInput-input': {
      border: `1px solid ${colors.lightGreyLines}`,
      borderRadius: 100,
      marginTop: 15,
      padding: 15,
      backgroundColor: '#835FCC',
    },
    '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
      '-webkit-appearance': 'none',
      margin: 0,
    },
    '& .MuiInput-underline:focus': {
      borderBottomColor: colors.white,
    },
  },
  button: {
    paddingTop: 10,
    paddingBottom: 10,
    borderColor: colors.white,
    color: colors.white,
    '&:hover': {
      backgroundColor: colors.white,
      color: colors.headlineText,
    },
    '&:active': {
      backgroundColor: colors.lightPurple,
      borderColor: colors.lightPurple,
      color: colors.headlineText,
    },
  },
  buttonGroup: {
    display: 'flex',
    [theme.breakpoints.down('xs')]: {
      display: 'block',
    },
  },
  tabs: {
    '& .MuiTabs-indicator': {
      display: 'flex',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    '& .MuiTabs-indicatorSpan': {
      maxWidth: 40,
      width: '100%',
      backgroundColor: colors.lightPurple,
    },
    marginBottom: 15,
  },
  tab: {
    textTransform: 'none',
    fontWeight: theme.typography.fontWeightRegular,
    fontSize: theme.typography.pxToRem(15),
    marginRight: theme.spacing(1),
    color: 'rgba(255, 255, 255, 0.7)',
    '&.Mui-selected': {
      color: '#fff',
    },
    '&.Mui-focusVisible': {
      backgroundColor: 'rgba(100, 95, 228, 0.32)',
    },
  },
  balanceGroup: {
    display: 'flex',
    columnGap: '7px',
    marginLeft: 'auto',
    marginRight: 0,
    alignItems: 'center',
    '& .MuiTypography-root': {
      fontSize: '14px',
    },
    '& .MuiChip-root': {
      border: `1px solid ${colors.lightPurple}`,
      backgroundColor: '#835FCC',
    },
  },
}))

const Staking: NextPage = () => {
  const classes = useStyles()
  const { connection } = useConnection()
  const anchorWallet = useAnchorWallet()
  const { publicKey, connected } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const [stakeConnection, setStakeConnection] = useState<StakeConnection>()
  const [stakeAccount, setStakeAccount] = useState<StakeAccount>()
  const [balance, setBalance] = useState<number>(0)
  const [pythBalance, setPythBalance] = useState<number>(0)
  const [lockedPythBalance, setLockedPythBalance] = useState<number>(0)
  const [unlockedPythBalance, setUnlockedPythBalance] = useState<number>(0)
  const [unvestedPythBalance, setUnvestedPythBalance] = useState<number>(0)
  const [amount, setAmount] = useState<number>(0)
  const [currentTab, setCurrentTab] = useState<string>('Deposit')

  // create stake connection when wallet is connected
  useEffect(() => {
    const createStakeConnection = async () => {
      const sc = await StakeConnection.createStakeConnection(
        connection,
        anchorWallet as Wallet,
        STAKING_PROGRAM
      )
      setStakeConnection(sc)
    }
    if (!connected) {
      setStakeConnection(undefined)
      setStakeAccount(undefined)
    } else {
      console.log('creating stake connection...')
      createStakeConnection()
      console.log('stake connection created')
    }
  }, [connected])

  // get stake accounts when stake connection is set
  useEffect(() => {
    if (stakeConnection) {
      stakeConnection
        ?.getStakeAccounts(publicKey!)
        .then((sa) => {
          if (sa.length > 0) {
            setStakeAccount(sa[0])
            console.log(sa[0])
          }
        })
        .then(() =>
          getPythTokenBalance(connection, publicKey!).then((balance) =>
            setPythBalance(balance)
          )
        )
    }
  }, [stakeConnection])

  // set ui balance amount whenever current tab changes
  useEffect(() => {
    if (connected) {
      switch (currentTab) {
        case 'Deposit':
          setBalance(pythBalance)
          break
        case 'Unlock':
          setBalance(lockedPythBalance)
          break
        case 'Withdraw':
          setBalance(unlockedPythBalance)
          break
      }
    } else {
      setBalance(0)
    }
  }, [
    currentTab,
    connected,
    pythBalance,
    lockedPythBalance,
    unlockedPythBalance,
  ])

  // set amount when input changes
  const handleAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAmount(parseFloat(event.target.value))
  }

  //handler
  const handleDeposit = async () => {
    if (stakeConnection && publicKey) {
      if (!stakeAccount) {
        // create stake account
        try {
          const sa = await stakeConnection.createStakeAccount(publicKey)
          setStakeAccount(sa)
          enqueueSnackbar('stake account created', { variant: 'success' })
        } catch (e) {
          enqueueSnackbar(e.message, { variant: 'error' })
        }
      }

      if (stakeAccount) {
        // deposit and lock
        try {
          await stakeConnection.depositAndLockTokens(
            publicKey,
            stakeAccount,
            amount
          )
          enqueueSnackbar(`deposited and locked ${amount} $PYTH`, {
            variant: 'success',
          })
        } catch (e) {
          console.log(e)
          enqueueSnackbar(e.message, { variant: 'error' })
        }
      }
    }
  }

  const handleChangeTab = (event: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue)
  }

  const handleHalfBalanceClick = () => {
    setAmount(balance / 2)
  }

  const handleMaxBalanceClick = () => {
    setAmount(balance)
  }

  useEffect(() => {
    console.log(`Current Tab: ${currentTab}`)
  }, [currentTab])

  useEffect(() => {
    console.log(`Current Amount: ${amount}`)
  }, [amount])

  return (
    <Layout>
      <Container className={classes.sectionContainer}>
        <Grid container justifyContent="center">
          <Grid item xs={12}>
            <Card className={classes.card}>
              <CardContent>
                <Tabs
                  value={currentTab}
                  onChange={handleChangeTab}
                  className={classes.tabs}
                  TabIndicatorProps={{
                    children: <span className="MuiTabs-indicatorSpan" />,
                  }}
                  centered
                >
                  <Tab
                    className={classes.tab}
                    value="Deposit"
                    label="Deposit"
                    disableRipple
                  />
                  <Tab
                    className={classes.tab}
                    value="Unlock"
                    label="Unlock"
                    disableRipple
                  />
                  <Tab
                    className={classes.tab}
                    value="Withdraw"
                    label="Withdraw"
                    disableRipple
                  />
                </Tabs>
                <Box
                  component="form"
                  noValidate
                  autoComplete="off"
                  className={classes.form}
                >
                  <FormControl fullWidth variant="standard">
                    <div className={classes.balanceGroup}>
                      <div className={classes.amountInputLabel}>
                        <InputLabel
                          shrink
                          htmlFor="amount-pyth-lock"
                          className={classes.amountInputLabel}
                        >
                          Amount (PYTH)
                        </InputLabel>
                      </div>
                      <Typography variant="body1">
                        Balance: {balance}
                      </Typography>
                      <div style={{ flex: 1 }} />
                      <Chip
                        label="Half"
                        variant="outlined"
                        size="small"
                        onClick={handleHalfBalanceClick}
                      />
                      <Chip
                        label="Max"
                        variant="outlined"
                        size="small"
                        onClick={handleMaxBalanceClick}
                      />
                    </div>
                    <Input
                      disableUnderline={true}
                      id="amount-pyth-lock"
                      type="number"
                      className={classes.amountInput}
                      onChange={handleAmountChange}
                      value={amount?.toString()}
                    />
                  </FormControl>
                </Box>
                <Grid container spacing={1} justifyContent="center">
                  <div className={classes.buttonGroup}>
                    {connected ? (
                      <Grid item xs={12}>
                        {currentTab === 'Deposit' ? (
                          <Button
                            variant="outlined"
                            disableRipple
                            className={classes.button}
                            onClick={handleDeposit}
                          >
                            Deposit
                          </Button>
                        ) : currentTab === 'Unlock' ? (
                          <Button
                            variant="outlined"
                            disableRipple
                            className={classes.button}
                          >
                            Unlock
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            disableRipple
                            className={classes.button}
                          >
                            Withdraw
                          </Button>
                        )}
                      </Grid>
                    ) : (
                      <Grid item xs={12}>
                        <WalletMultiButton
                          variant="outlined"
                          disableRipple
                          className={classes.button}
                        >
                          Connect Wallet
                        </WalletMultiButton>
                      </Grid>
                    )}
                  </div>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Grid container justifyContent="center">
          <Grid item xs={12}>
            <Card className={classes.cardBlack}>
              <CardContent>
                <TableContainer style={{ maxHeight: '78vh' }}>
                  <Table
                    sx={{
                      [`& .${tableCellClasses.root}`]: {
                        borderBottom: 'none',
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell width="70%">Tokens</TableCell>
                        <TableCell align="right">Amount (PYTH)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow key="Unlocked">
                        <TableCell>Unlocked</TableCell>
                        <TableCell align="right">
                          {connected ? unlockedPythBalance : '-'}
                        </TableCell>
                      </TableRow>
                      <TableRow key="Locked">
                        <TableCell>Locked</TableCell>
                        <TableCell align="right">
                          {connected ? lockedPythBalance : '-'}
                        </TableCell>
                      </TableRow>
                      <TableRow key="Unvested">
                        <TableCell>Unvested</TableCell>
                        <TableCell align="right">
                          {connected ? unvestedPythBalance : '-'}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  )
}

export default Staking