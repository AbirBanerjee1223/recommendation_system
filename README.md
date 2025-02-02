# Recommendation System Website

Welcome to the Recommendation System Website! This application demonstrates the functionality of a recommendation system that provides personalized product suggestions based on user history and product attributes. 

## Features

The website offers three distinct types of recommendations:

1. **Content-Based Recommendation**: 
   - This method suggests products that are similar to those the user has previously interacted with, based on product features.

2. **Hybrid Recommendation**: 
   - This approach combines content-based filtering with collaborative filtering to present users with new and unique products that may pique their interest.

3. **User -Based Recommendation**: 
   - This method analyzes the last few products browsed by the user and provides suggestions based on those interactions using content-based techniques.

## Demo

An example of the website's functionality, showcasing both the Content-Based and Collaborative-Based recommendation models, can be found in the following Google Drive link:

[View Demo on Google Drive](https://drive.google.com/drive/folders/1T8cjBZzlIr7eNGkCMeqhtiPS6pgjkw72?usp=sharing)

## Getting Started

To run the website and access the recommendation system locally, please follow these steps:

### Prerequisites

- Ensure you have Python installed on your machine.
- Install `pip` if it is not already installed.

### Installation Steps

1. **Clone the Repository**:
   - Download or clone all the files in this repository to your local machine.

2. **Download the Models**:
   - Download both recommendation models from the Google Drive link provided above.
   - Save the models in the same directory as the downloaded repository files.

3. **Install Dependencies**:
   - Open your terminal and navigate to the project directory.
   - Run the following command to install the required packages:
     ```bash
     pip install -r requirements.txt
     ```

4. **Start the Backend**:
   - In the terminal, run the following command to start the Flask backend:
     ```bash
     python app.py
     ```

5. **Access the Website**:
   - Open your web browser and navigate to `http://127.0.0.1:5000` to access the website.
   - Alternatively, you can host the `index.html` file locally using a simple HTTP server.

## Important Notes

- Ensure that your environment is set up correctly with all necessary dependencies.
- If you encounter any issues, please check the repository's issues section or feel free to open a new issue for assistance.

## Contributing

Contributions are welcome! If you would like to contribute to this project, please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
