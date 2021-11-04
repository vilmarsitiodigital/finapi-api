const { request } = require('express');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(express.json());

const customers = [];

function verifyCustomerCPF(req, res, next) {
  const { cpf } = req.headers;
  const customer = customers.find((customer) => customer.cpf === cpf);
  if (!customer) {
    return res.status(400).json({ message: 'Customer not exists' });
  }

  req.customer = customer;

  next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type == 'credit') {
      return acc + operation.amount;
    } else {
      return acc - operation.amount;
    }
  }, 0);

  return balance;
}

app.post('/account', (req, res) => {
  const { cpf, name } = req.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return res.status(400).json({ message: 'Customer already exists' });
  }

  customers.push({
    id: uuidv4(),
    name,
    cpf,
    statement: [],
  });

  res.status(201).json({ message: 'success', customers: customers });
});

app.get('/statement', verifyCustomerCPF, (req, res) => {
  const { customer } = req;
  res.json({ message: 'success', statement: customer.statement });
});

app.post('/deposit', verifyCustomerCPF, (req, res) => {
  const { description, amount } = req.body;
  const { customer } = req;

  const statementOperation = {
    description,
    amount,
    type: 'credit',
    created_at: new Date(),
  };

  customer.statement.push(statementOperation);

  res.status(201).json({ message: 'success', customer: customer });
});

app.post('/withdrawn', verifyCustomerCPF, (req, res) => {
  const { customer } = req;
  const { amount } = req.body;

  const balance = getBalance(customer.statement);
  console.log(balance);
  if (amount > balance) {
    return res.status(400).json({ message: 'Insufficient funds!' });
  }

  const statementOperation = {
    description: `Withdrawn`,
    amount,
    type: 'debit',
    created_at: new Date(),
  };

  customer.statement.push(statementOperation);

  res.status(201).json({ message: 'success', customer: customer });
});

app.get('/statement/date', verifyCustomerCPF, (req, res) => {
  const { date } = req.query;
  const { customer } = req;

  const dateFormat = new Date(date + ' 00:00');

  const statements = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() === dateFormat.toDateString()
  );

  res.json({ message: 'success', statements: statements });
});

app.get('/account', verifyCustomerCPF, (req, res) => {
  const { customer } = req;

  res.status(201).json({ message: 'success', customer: customer });
});

app.put('/account', verifyCustomerCPF, (req, res) => {
  const { customer } = req;
  const { name } = req.body;
  customer.name = name;
  res.status(201).json({ message: 'success', customer: customer });
});

app.delete('/account', verifyCustomerCPF, (req, res) => {
  const { customer } = req;
  customers.splice(customer, 1);
  res.status(201).json({ message: 'success', customers: customers });
});

app.get('/balance', verifyCustomerCPF, (req, res) => {
  const { customer } = req;

  const balance = getBalance(customer.statement);

  res.status(201).json({ message: 'success', balance: balance });
});

app.listen(3333);
