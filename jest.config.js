module.exports = {
    transform: {
      '^.+\\.jsx?$': 'babel-jest'
    },
    moduleNameMapper: {
      '\\.(jpg|jpeg|png|svg)$': '<rootDir>/__mocks__/fileMock.js'
    }
  };
  