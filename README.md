# Farcaster Group Chat Scraper

This package allows you to scrape group chat data using your own account on Farcaster. Before using this package, please follow the steps below to set it up.

## Installation

1. Install the `farcaster-auth-tokens` package by following the instructions in its README. This package is a dependency for the group chat scraper.

## Configuration

1. Generate a token by following the instructions in the `farcaster-auth-tokens` README. This token will be used to authenticate the scraper.

2. Create a `.env` file in the bot folder of this package.

3. In the `.env` file, add the following line and replace `<YOUR_TOKEN>` with the token you generated:

    ```
    AUTH_TOKEN=<YOUR_TOKEN>
    ```

## Usage

1. Run the following command to start the scraper:

    ```
    node index.js
    ```

2. The scraper will simulate a browser and prompt you to log in to Farcaster. Follow the instructions in the browser to complete the login process.

3. Once logged in, the scraper will start scraping group chat data and saving it to the desired location.

## Contributing

If you encounter any issues or have suggestions for improvements, please feel free to open an issue or submit a pull request on the GitHub repository.

## License

This package is licensed under the [MIT License](https://opensource.org/licenses/MIT).