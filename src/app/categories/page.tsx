import { getCategories } from '../actions/categories-actions';
import CategoriesClient from './CategoriesClient';

export default async function CategoriesPage() {
  const categories = await getCategories();

  return <CategoriesClient initialCategories={categories} />;
}