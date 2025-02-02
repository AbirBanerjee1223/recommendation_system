from flask import Flask, jsonify, request
import pandas as pd
import numpy as np
import random
import pickle
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
from scipy.spatial.distance import pdist, squareform

app = Flask(__name__)
CORS(app)

# Load your models
def load_model(model_path):
    with open(model_path, 'rb') as f:
        return pickle.load(f)

# Store recently viewed product IDs
recently_viewed = []

class DiverseRecommendationSystem:
    def __init__(self, df):
        self.df = df
        self.prepare_features()
    
    def prepare_features(self):
        # Combine multiple text features
        self.df['combined_features'] = (
            self.df['Product Name'] + ' ' + 
            self.df['Product Description'] + ' ' + 
            self.df['Product Tags']
        )
        
        self.df['category_brand'] = (
            self.df['Product Category'].fillna('') + ' ' + 
            self.df['Product Brand'].fillna('')
        )
        
        self.content_similarity = self.compute_text_similarity()
        self.category_similarity = self.compute_category_similarity()
        self.price_similarity = self.compute_price_similarity()
        self.rating_similarity = self.compute_rating_similarity()
    
    def compute_text_similarity(self):
        tfidf = TfidfVectorizer(stop_words='english')
        feature_matrix = tfidf.fit_transform(self.df['combined_features'])
        return cosine_similarity(feature_matrix)
    
    def compute_category_similarity(self):
        tfidf = TfidfVectorizer(stop_words='english')
        category_matrix = tfidf.fit_transform(self.df['category_brand'])
        return cosine_similarity(category_matrix)
    
    def compute_price_similarity(self):
        prices = self.df['Product Price'].fillna(0).values.reshape(-1, 1)
        scaler = MinMaxScaler()
        normalized_prices = scaler.fit_transform(prices)
        price_distances = pdist(normalized_prices, metric='euclidean')
        return 1 - squareform(price_distances)
    
    def compute_rating_similarity(self):
        ratings = self.df['Product Rating'].fillna(0).values.reshape(-1, 1)
        scaler = MinMaxScaler()
        normalized_ratings = scaler.fit_transform(ratings)
        rating_distances = pdist(normalized_ratings, metric='euclidean')
        return 1 - squareform(rating_distances)
    
    # Get diverse recommendations based on product ID
    def get_diverse_recommendations(self, product_id, n_recommendations=10, 
                                  content_weight=0.3,
                                  category_weight=0.4,
                                  price_weight=0.2,
                                  rating_weight=0.0,
                                  diversity_threshold=0.6):
        try:
            idx = self.df[self.df['Product Id'] == product_id].index[0]
            hybrid_scores = (
                content_weight * self.content_similarity[idx] +
                category_weight * self.category_similarity[idx] +
                price_weight * self.price_similarity[idx] +
                rating_weight * self.rating_similarity[idx]
            )
            recommendations = []
            used_indices = {idx}
            candidate_indices = np.argsort(hybrid_scores)[::-1]
            for candidate_idx in candidate_indices:
                if candidate_idx in used_indices:
                    continue
                is_diverse = True
                for rec_idx in used_indices:
                    similarity = (
                        content_weight * self.content_similarity[candidate_idx][rec_idx] +
                        category_weight * self.category_similarity[candidate_idx][rec_idx] +
                        price_weight * self.price_similarity[candidate_idx][rec_idx] +
                        rating_weight * self.rating_similarity[candidate_idx][rec_idx]
                    )
                    if similarity > diversity_threshold:
                        is_diverse = False
                        break
                if is_diverse:
                    recommendations.append(self.df.iloc[candidate_idx]['Product Id'])
                    used_indices.add(candidate_idx)
                if len(recommendations) >= n_recommendations:
                    break
            return recommendations
        except Exception as e:
            print(f"Error generating recommendations: {str(e)}")
            return []

class CollaborativeRecommendationSystem:
    def __init__(self, user_interaction_matrix):
        self.user_interaction_matrix = user_interaction_matrix
        self.product_similarity = self.compute_product_similarity()

    # Compute product similarity based on user interactions
    def compute_product_similarity(self):
        product_similarity = cosine_similarity(self.user_interaction_matrix.T)
        return pd.DataFrame(product_similarity, index=self.user_interaction_matrix.columns, columns=self.user_interaction_matrix.columns)

    # Get collaborative recommendations based on product ID
    def get_col_recommendations(self, product_id, n_recommendations=10):
        if product_id not in self.product_similarity.columns:
            return []
        similar_scores = self.product_similarity[product_id]
        top_recommendations = similar_scores.sort_values(ascending=False).head(n_recommendations + 1)
        return top_recommendations.index[1:].tolist()

# Default route
@app.route('/')
def home():
    return "Welcome to the Flask server!"

# Route to get all data
@app.route('/data', methods=['GET'])
def get_data():
    try:
        products_df = pd.read_csv('final_products.csv')
        products_df.fillna('', inplace=True)
        data = products_df.to_dict(orient='records')  
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Route to get paginated data
@app.route('/data/paginated', methods=['GET'])
def get_paginated_data():
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 100))
        products_df = pd.read_csv('sample_products.csv')
        
        start_index = (page - 1) * limit
        end_index = page * limit
        paginated_results = {
            'data': products_df.iloc[start_index:end_index].where(pd.notnull(products_df), None).to_dict(orient='records'),
            'total': len(products_df),
            'page': page,
            'totalPages': (len(products_df) + limit - 1) // limit
        }
        return jsonify(paginated_results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Route to get recommendations based on product ID
@app.route('/recommendations/<product_id>', methods=['GET'])
def get_recommendations(product_id):
    global recently_viewed
    try:
        content_based_model = load_model('content_rec.pkl')
        hybrid_model = load_model('collab_rec.pkl')
        print("Models loaded successfully.")

        if product_id not in recently_viewed:
            if len(recently_viewed) >= 4:
                recently_viewed.pop(0)
            recently_viewed.append(product_id)

        similar_recommendations = content_based_model.get_diverse_recommendations(
            product_id, 
            content_weight=0.5, 
            category_weight=0.1, 
            price_weight=0.0, 
            rating_weight=0.0, 
            diversity_threshold=0.3
        )
        collab_recommendations = hybrid_model.get_col_recommendations(product_id)
        
        previous_recom = []
        
        if len(recently_viewed) > 1:
            for viewed_id in recently_viewed[:-1]:
                viewed_recommendations = content_based_model.get_diverse_recommendations(
                    viewed_id,
                    n_recommendations=5,
                    content_weight=0.7,
                    category_weight=0.3,
                    price_weight=0.0,
                    rating_weight=0.0,
                    diversity_threshold=0.3
                )
                previous_recom.extend(viewed_recommendations)
            
            previous_recom = list(dict.fromkeys([id for id in previous_recom if id != product_id]))
            random.shuffle(previous_recom)
            previous_recom = previous_recom[:15]
        
        content_based_df = pd.DataFrame(similar_recommendations, columns=['Product Id'])
        collaborative_filtering_df = pd.DataFrame(collab_recommendations, columns=['Product Id'])
        hybrid_rec = pd.concat([content_based_df, collaborative_filtering_df]).drop_duplicates()
        shuffled_hybrid_rec = hybrid_rec.sample(frac=1).reset_index(drop=True)
        shuffled_hybrid_list = shuffled_hybrid_rec['Product Id'].head(15).tolist()

        print(similar_recommendations)
        print(shuffled_hybrid_list)
        print("Previous recommendations:", previous_recom)
        
        return jsonify({
            'content_based': similar_recommendations,
            'hybrid': shuffled_hybrid_list,
            'prev_viewed': previous_recom
        })
        
    except Exception as e:
        print(f"Error fetching recommendations for product ID {product_id}: {e}")
        return jsonify({'error': str(e)}), 500
    
@app.route('/data/<product_id>', methods=['GET'])
def get_product_details(product_id):
    try:
        products_df = pd.read_csv('final_products.csv')
        products_df.fillna('', inplace=True)
        product = products_df[products_df['Product Id'] == product_id]
        if product.empty:
            return jsonify({'error': 'Product not found'}), 404
        
        product_details = product.to_dict(orient='records')[0]
        return jsonify(product_details)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)